const express = require('express');
const cors = require('cors');
const path = require('path');
const { executeCode } = require('./executor');
const { LANGUAGES, getLanguageStatus } = require('./languages');
const { pool } = require('./database/db');

// ─── App Setup ───────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── POST /compile — Execute code ───────────────────────────────────────────
app.post('/compile', async (req, res) => {
  const startTime = Date.now();

  try {
    const { language, code, input, timeout } = req.body;

    if (!language) {
      return res.status(400).json({
        success: false,
        output: '',
        error: 'Missing required field: "language"',
        executionTime: 0,
      });
    }

    if (!code || code.trim() === '') {
      return res.status(400).json({
        success: false,
        output: '',
        error: 'Missing required field: "code"',
        executionTime: 0,
      });
    }

    const langKey = language.toLowerCase().replace(/[^a-z+]/g, '').replace('c++', 'cpp');
    const result = await executeCode(langKey, code, input || '', timeout || 5000);

    return res.json({
      success: result.success,
      output: result.output || '',
      error: result.error || '',
      executionTime: result.executionTime || (Date.now() - startTime),
      timedOut: result.timedOut || false,
      language: langKey,
    });
  } catch (err) {
    console.error('Compile endpoint error:', err);
    return res.status(500).json({
      success: false,
      output: '',
      error: `Server error: ${err.message}`,
      executionTime: Date.now() - startTime,
    });
  }
});

// ─── POST /api/compile — Piston-compatible endpoint ────────────────────────
app.post('/api/compile', async (req, res) => {
  const startTime = Date.now();

  try {
    const { language, files, stdin } = req.body;
    const code = (files && files.length > 0) ? files[0].content : '';
    const input = stdin || '';

    if (!language) {
      return res.status(400).json({
        run: { stdout: '', stderr: 'Missing required field: "language"', code: 1 },
        message: 'Missing language',
      });
    }

    if (!code || code.trim() === '') {
      return res.status(400).json({
        run: { stdout: '', stderr: 'Missing required field: code', code: 1 },
        message: 'Missing code',
      });
    }

    const langKey = language.toLowerCase().replace(/[^a-z+]/g, '').replace('c++', 'cpp');
    const result = await executeCode(langKey, code, input, 5000);

    return res.json({
      run: {
        stdout: result.output || '',
        stderr: result.error || '',
        code: result.success ? 0 : 1,
        signal: null,
        output: (result.output || '') + (result.error || ''),
      },
      language: langKey,
    });
  } catch (err) {
    console.error('Piston-compat endpoint error:', err);
    return res.status(500).json({
      run: { stdout: '', stderr: `Server error: ${err.message}`, code: 1 },
      message: `Server error: ${err.message}`,
    });
  }
});

// ============================================================================
// 📦 POSTGRESQL DATABASE REST APIs
// ============================================================================

// 1. AUTHENTICATION (Admin & Student Login)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password, role, studentDetails } = req.body;

    if (role === 'admin') {
      const q = await pool.query('SELECT * FROM admins WHERE username = $1 AND password_hash = $2', [username, password]);
      if (q.rows.length > 0) {
        return res.json({
          success: true,
          user: { id: q.rows[0].id, username: q.rows[0].username, name: q.rows[0].name, role: 'admin' }
        });
      }
      return res.status(401).json({ success: false, error: 'Invalid admin credentials' });
    } else {
      // Student login
      const rollNo = (username || '').toUpperCase();
      let q = await pool.query('SELECT * FROM students WHERE reg_no = $1 AND password_hash = $2', [rollNo, password]);
      
      // Auto-register student if missing and valid format
      if (q.rows.length === 0 && studentDetails && studentDetails.branch) {
        const insertQ = await pool.query(`
          INSERT INTO students (reg_no, password_hash, name, batch, branch, section)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (reg_no) DO UPDATE SET password_hash = $2, batch = $4, branch = $5, section = $6
          RETURNING *
        `, [rollNo, password, rollNo, studentDetails.batch || '2022-2026', studentDetails.branch || 'CSE', studentDetails.section || '1']);
        q = insertQ;
      }

      if (q.rows.length > 0) {
        const s = q.rows[0];
        return res.json({
          success: true,
          user: { id: s.reg_no, reg_no: s.reg_no, name: s.name, batch: s.batch, branch: s.branch, section: s.section, role: 'student' }
        });
      }
      return res.status(401).json({ success: false, error: 'Invalid student credentials' });
    }
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. STUDENTS API (Fetch all students, single & bulk registration)
app.get('/api/students', async (req, res) => {
  try {
    const q = await pool.query('SELECT * FROM students ORDER BY reg_no ASC');
    res.json({ success: true, students: q.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/students/bulk', async (req, res) => {
  try {
    const { students } = req.body; // Array of student objects or key-value map
    if (!students) return res.status(400).json({ success: false, error: 'Missing students data' });

    const studentList = Array.isArray(students) ? students : Object.values(students);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      for (const s of studentList) {
        const regNo = (s.reg_no || s.roll_no || s.id || '').toUpperCase();
        if (!regNo) continue;
        await client.query(`
          INSERT INTO students (reg_no, password_hash, name, batch, branch, section)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (reg_no) DO UPDATE 
          SET password_hash = EXCLUDED.password_hash,
              name = EXCLUDED.name,
              batch = EXCLUDED.batch,
              branch = EXCLUDED.branch,
              section = EXCLUDED.section
        `, [regNo, s.password_hash || s.password || regNo, s.name || regNo, s.batch || '2022-2026', s.branch || 'CSE', s.section || '1']);
      }
      await client.query('COMMIT');
      res.json({ success: true, count: studentList.length });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. EXAMS API (Get all exams with nested questions, options, test cases)
app.get('/api/exams', async (req, res) => {
  try {
    const examsQ = await pool.query('SELECT * FROM exams ORDER BY created_at DESC');
    const exams = examsQ.rows;

    for (const exam of exams) {
      const qQ = await pool.query('SELECT * FROM questions WHERE exam_id = $1 ORDER BY order_num ASC', [exam.id]);
      const questions = qQ.rows;

      for (const q of questions) {
        // Options
        const optQ = await pool.query('SELECT * FROM mcq_options WHERE question_id = $1 ORDER BY option_key ASC', [q.id]);
        q.options = optQ.rows.map(o => ({
          key: o.option_key,
          text: o.option_text,
          isCorrect: o.is_correct,
          scoreWeight: o.score_weight
        }));

        // Coding details
        if (q.question_type === 'coding') {
          const codeQ = await pool.query('SELECT * FROM coding_questions WHERE question_id = $1', [q.id]);
          if (codeQ.rows.length > 0) {
            q.problemStatement = codeQ.rows[0].problem_statement;
            q.constraints = codeQ.rows[0].constraints;
            q.starterTemplates = codeQ.rows[0].starter_templates;
          }

          // Test cases
          const tcQ = await pool.query('SELECT * FROM test_cases WHERE question_id = $1 ORDER BY test_order ASC', [q.id]);
          q.testCases = tcQ.rows.map(tc => ({
            input: tc.input_data,
            output: tc.expected_output,
            isHidden: tc.is_hidden,
            weight: tc.weight
          }));
        }
      }
      exam.questions = questions;
    }

    res.json({ success: true, exams });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Save Exam (Single or Bulk)
app.post('/api/exams', async (req, res) => {
  const client = await pool.connect();
  try {
    const exam = req.body;
    await client.query('BEGIN');

    await client.query(`
      INSERT INTO exams (id, title, exam_type, duration_minutes, start_time, end_time, batch, branch, status, attempt_limit, topics, total_marks)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        exam_type = EXCLUDED.exam_type,
        duration_minutes = EXCLUDED.duration_minutes,
        batch = EXCLUDED.batch,
        branch = EXCLUDED.branch,
        status = EXCLUDED.status,
        attempt_limit = EXCLUDED.attempt_limit,
        topics = EXCLUDED.topics,
        total_marks = EXCLUDED.total_marks
    `, [
      exam.id,
      exam.title || 'Untitled Exam',
      exam.examType || (exam.isSurvey ? 'survey' : 'standard'),
      exam.duration || 60,
      exam.startTime ? new Date(exam.startTime) : null,
      exam.endTime ? new Date(exam.endTime) : null,
      JSON.stringify(Array.isArray(exam.batch) ? exam.batch : [exam.batch || '2022-2026']),
      JSON.stringify(Array.isArray(exam.branch) ? exam.branch : [exam.branch || 'CSE']),
      exam.status || 'published',
      exam.attemptLimit || 1,
      JSON.stringify(exam.topics || []),
      exam.totalMarks || 100
    ]);

    // Insert Questions if provided
    if (exam.questions && Array.isArray(exam.questions)) {
      for (let i = 0; i < exam.questions.length; i++) {
        const q = exam.questions[i];
        const qId = q.id || `${exam.id}_q${i+1}`;

        await client.query(`
          INSERT INTO questions (id, exam_id, question_text, question_type, marks, topic, order_num)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            question_text = EXCLUDED.question_text,
            question_type = EXCLUDED.question_type,
            marks = EXCLUDED.marks,
            topic = EXCLUDED.topic,
            order_num = EXCLUDED.order_num
        `, [qId, exam.id, q.question || q.questionText || '', q.type || q.questionType || 'mcq', q.marks || 1, q.topic || '', i + 1]);

        // Options
        if (q.options && Array.isArray(q.options)) {
          await client.query('DELETE FROM mcq_options WHERE question_id = $1', [qId]);
          for (const opt of q.options) {
            await client.query(`
              INSERT INTO mcq_options (question_id, option_key, option_text, is_correct, score_weight)
              VALUES ($1, $2, $3, $4, $5)
            `, [qId, opt.key || 'a', opt.text || opt, opt.isCorrect || false, opt.scoreWeight || 0]);
          }
        }

        // Test Cases
        if (q.testCases && Array.isArray(q.testCases)) {
          await client.query('DELETE FROM test_cases WHERE question_id = $1', [qId]);
          for (let tcIdx = 0; tcIdx < q.testCases.length; tcIdx++) {
            const tc = q.testCases[tcIdx];
            await client.query(`
              INSERT INTO test_cases (question_id, is_hidden, input_data, expected_output, weight, test_order)
              VALUES ($1, $2, $3, $4, $5, $6)
            `, [qId, tc.isHidden || false, tc.input || '', tc.output || '', tc.weight || 1, tcIdx + 1]);
          }
        }
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, examId: exam.id });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// 4. RESULTS & EXAM ATTEMPTS API
app.get('/api/results', async (req, res) => {
  try {
    const q = await pool.query('SELECT * FROM exam_attempts ORDER BY submitted_at DESC');
    res.json({ success: true, results: q.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/results', async (req, res) => {
  try {
    const r = req.body;
    const insertQ = await pool.query(`
      INSERT INTO exam_attempts (exam_id, student_reg_no, attempt_number, status, score, max_score, percentage, time_spent_seconds, topic_percentages, ai_report)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      r.examId,
      (r.studentId || r.studentRegNo || '').toUpperCase(),
      r.attemptNumber || 1,
      r.status || 'completed',
      r.score || 0,
      r.maxScore || 100,
      r.percentage || ((r.score / (r.maxScore || 100)) * 100),
      r.timeSpentSeconds || 0,
      JSON.stringify(r.topicPercentages || {}),
      JSON.stringify(r.aiReport || {})
    ]);

    res.json({ success: true, attempt: insertQ.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. SURVEY AI TOPIC ANALYSIS API
app.get('/api/survey/ai-reports/:exam_id', async (req, res) => {
  try {
    const { exam_id } = req.params;
    const q = await pool.query('SELECT * FROM survey_ai_topic_analysis WHERE exam_id = $1', [exam_id]);
    res.json({ success: true, reports: q.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/survey/ai-reports', async (req, res) => {
  try {
    const { examId, studentRegNo, topicName, percentageScore, sentimentScore, riskLevel, aiFeedback, keyStrengths, improvementAreas } = req.body;

    const q = await pool.query(`
      INSERT INTO survey_ai_topic_analysis (exam_id, student_reg_no, topic_name, percentage_score, sentiment_score, risk_level, ai_feedback, key_strengths, improvement_areas)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (exam_id, student_reg_no, topic_name) DO UPDATE SET
        percentage_score = EXCLUDED.percentage_score,
        sentiment_score = EXCLUDED.sentiment_score,
        risk_level = EXCLUDED.risk_level,
        ai_feedback = EXCLUDED.ai_feedback,
        key_strengths = EXCLUDED.key_strengths,
        improvement_areas = EXCLUDED.improvement_areas,
        evaluated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [
      examId,
      (studentRegNo || '').toUpperCase(),
      topicName,
      percentageScore || 0,
      sentimentScore || 0,
      riskLevel || 'Normal',
      aiFeedback || '',
      keyStrengths || [],
      improvementAreas || []
    ]);

    res.json({ success: true, report: q.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /languages — List supported languages ──────────────────────────────
app.get('/languages', (req, res) => {
  const status = getLanguageStatus();
  const languages = Object.entries(LANGUAGES).map(([key, lang]) => ({
    key,
    name: lang.name,
    extension: lang.extension,
    compiled: lang.compiled,
    available: status[key]?.available || false,
    boilerplate: lang.boilerplate,
  }));
  res.json({ languages });
});

// ─── GET /health — Health check ─────────────────────────────────────────────
app.get('/health', async (req, res) => {
  const status = getLanguageStatus();
  let dbStatus = 'disconnected';
  try {
    await pool.query('SELECT 1');
    dbStatus = 'connected (vm database)';
  } catch (e) {
    dbStatus = `error: ${e.message}`;
  }

  res.json({
    status: 'ok',
    uptime: process.uptime(),
    database: dbStatus,
    languages: status,
  });
});

// ─── Start Server ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n╔══════════════════════════════════════════════╗`);
  console.log(`║   ⚡ VIGNAN MASTERY — Backend & DB API ⚡    ║`);
  console.log(`╠══════════════════════════════════════════════╣`);
  console.log(`║  Server running on http://localhost:${PORT}    ║`);
  console.log(`║  PostgreSQL Database: "vm" (Connected)       ║`);
  console.log(`╚══════════════════════════════════════════════╝\n`);
});
