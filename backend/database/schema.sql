-- =======================================================================
-- VIGNAN MASTERY DATABASE SCHEMA (PostgreSQL)
-- Database Name: vm
-- Covers:
--  1) Admin Login Credentials
--  2) Registered Students (Single & Bulk Dump)
--  3) MCQ Questions, Options & Correct Option
--  4) Coding Questions, Sample & Hidden Test Cases (Up to 10+)
--  5) Survey MCQ Questions & Weighted Options
--  6) Survey Multi-Selection Questions & Options
--  7) Survey Text-Based Open-Ended Questions
--  8) Student Results, Test Attempts, Topic Percentages, Section Analytics
-- =======================================================================

-- 1. ADMINS TABLE
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(150) NOT NULL DEFAULT 'Administrator',
    role VARCHAR(50) NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. STUDENTS TABLE (Registration, Credentials, Branch, Batch, Section)
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    reg_no VARCHAR(50) UNIQUE NOT NULL,  -- e.g. '211FA04001'
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(150) NOT NULL,
    batch VARCHAR(50) NOT NULL,          -- e.g. '2022-2026'
    branch VARCHAR(50) NOT NULL,         -- e.g. 'CSE', 'ECE', 'IT', 'AI'
    section VARCHAR(20) NOT NULL,        -- e.g. '1', '2', '3'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'inactive'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. EXAMS TABLE (Standard & Survey Exams)
CREATE TABLE IF NOT EXISTS exams (
    id VARCHAR(100) PRIMARY KEY,        -- e.g. 'exam_1724250000'
    title VARCHAR(255) NOT NULL,
    exam_type VARCHAR(50) NOT NULL DEFAULT 'standard', -- 'standard' (MCQ+Coding) or 'survey'
    duration_minutes INT NOT NULL DEFAULT 60,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    batch JSONB NOT NULL DEFAULT '["2022-2026"]'::jsonb,   -- Array of batches e.g. ["2022-2026", "2023-2027"]
    branch JSONB NOT NULL DEFAULT '["CSE"]'::jsonb,        -- Array of branches e.g. ["CSE", "ECE", "ALL"]
    status VARCHAR(50) NOT NULL DEFAULT 'published',      -- 'published', 'draft'
    attempt_limit INT NOT NULL DEFAULT 1,                 -- 1, 2, -1 (unlimited)
    topics JSONB DEFAULT '[]'::jsonb,                     -- Survey topics / keywords array
    total_marks INT NOT NULL DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. QUESTIONS TABLE (MCQ, Coding, Survey MCQ, Survey Multi-Select, Survey Text)
CREATE TABLE IF NOT EXISTS questions (
    id VARCHAR(100) PRIMARY KEY,        -- e.g. 'q_1724250001'
    exam_id VARCHAR(100) NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL, -- 'mcq', 'coding', 'survey_mcq', 'survey_multi', 'survey_text'
    marks INT NOT NULL DEFAULT 1,
    topic VARCHAR(150),                 -- Tagged survey topic/keyword (e.g. 'Mental Health & Wellbeing')
    order_num INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. MCQ & SURVEY OPTIONS TABLE
CREATE TABLE IF NOT EXISTS mcq_options (
    id SERIAL PRIMARY KEY,
    question_id VARCHAR(100) NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    option_key VARCHAR(10) NOT NULL,    -- 'a', 'b', 'c', 'd', 'e'
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,   -- TRUE for correct MCQ answer, FALSE for survey
    score_weight NUMERIC(5,2) DEFAULT 0 -- For Survey Topic % weighting (e.g. 100, 75, 50, 25)
);

-- 6. CODING QUESTIONS DETAILS TABLE
CREATE TABLE IF NOT EXISTS coding_questions (
    question_id VARCHAR(100) PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
    problem_statement TEXT NOT NULL,
    constraints TEXT,
    starter_templates JSONB DEFAULT '{"python": "# Write solution\\n", "java": "// Java Solution\\n", "cpp": "// C++ Solution\\n", "c": "/* C Solution */\\n"}'::jsonb
);

-- 7. TEST CASES TABLE (Sample & Hidden Test Cases up to 10+)
CREATE TABLE IF NOT EXISTS test_cases (
    id SERIAL PRIMARY KEY,
    question_id VARCHAR(100) NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE, -- FALSE = Sample (visible), TRUE = Hidden (evaluation)
    input_data TEXT NOT NULL,
    expected_output TEXT NOT NULL,
    weight INT NOT NULL DEFAULT 1,
    test_order INT NOT NULL DEFAULT 1
);

-- 8. EXAM ATTEMPTS & RESULTS TABLE (Student Score, Percentage, Survey Topic Scores)
CREATE TABLE IF NOT EXISTS exam_attempts (
    id SERIAL PRIMARY KEY,
    exam_id VARCHAR(100) NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_reg_no VARCHAR(50) NOT NULL REFERENCES students(reg_no) ON DELETE CASCADE,
    attempt_number INT NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'completed', -- 'in_progress', 'completed'
    score NUMERIC(6,2) NOT NULL DEFAULT 0,
    max_score NUMERIC(6,2) NOT NULL DEFAULT 100,
    percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
    time_spent_seconds INT NOT NULL DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    topic_percentages JSONB DEFAULT '{}'::jsonb, -- e.g. {"Mental Health & Wellbeing": 85.0, "Academic Stress": 60.0}
    ai_report JSONB DEFAULT '{}'::jsonb          -- Instant psychological/academic report & recommendations
);

-- 9. STUDENT QUESTION ANSWERS TABLE (Individual Question Submissions)
CREATE TABLE IF NOT EXISTS student_question_answers (
    id SERIAL PRIMARY KEY,
    attempt_id INT NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
    question_id VARCHAR(100) NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    selected_options TEXT[],             -- Single MCQ ('a') or Multi-Select (['a', 'c'])
    text_response TEXT,                  -- Open-ended written answer for survey text questions
    submitted_code TEXT,                 -- Submitted program code for coding questions
    code_language VARCHAR(50),           -- 'python', 'java', 'cpp', 'c', 'javascript'
    is_correct BOOLEAN,
    marks_obtained NUMERIC(5,2) DEFAULT 0,
    test_cases_passed INT DEFAULT 0,
    total_test_cases INT DEFAULT 0
);

-- 10. SPECIAL TABLE: SURVEY AI TOPIC / KEYWORD ANALYSIS
-- Dedicated table specifically for topic/keyword analysis evaluated by AI per student per survey
CREATE TABLE IF NOT EXISTS survey_ai_topic_analysis (
    id SERIAL PRIMARY KEY,
    exam_id VARCHAR(100) NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_reg_no VARCHAR(50) NOT NULL REFERENCES students(reg_no) ON DELETE CASCADE,
    attempt_id INT REFERENCES exam_attempts(id) ON DELETE CASCADE,
    topic_name VARCHAR(200) NOT NULL,          -- e.g. 'Academic Stress & Burnout', 'Career & Placement Readiness'
    percentage_score NUMERIC(5,2) NOT NULL,    -- 0.00% to 100.00%
    sentiment_score NUMERIC(5,2) DEFAULT 0,    -- -1.00 to +1.00 or 0 to 100
    risk_level VARCHAR(50) DEFAULT 'Normal',   -- 'High Risk', 'Moderate', 'Healthy / Excellent'
    ai_feedback TEXT,                          -- AI generated diagnostic summary for this keyword
    key_strengths TEXT[],                      -- Specific strengths identified for this topic
    improvement_areas TEXT[],                  -- Specific recommendations & support areas
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_survey_topic UNIQUE(exam_id, student_reg_no, topic_name)
);

-- 11. SPECIAL TABLE: SURVEY SECTION TOPIC AGGREGATES
-- Stores computed average percentage of every section for every topic/keyword
CREATE TABLE IF NOT EXISTS survey_section_topic_analytics (
    id SERIAL PRIMARY KEY,
    exam_id VARCHAR(100) NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    batch VARCHAR(50) NOT NULL,                -- e.g. '2022-2026'
    branch VARCHAR(50) NOT NULL,               -- e.g. 'CSE'
    section VARCHAR(20) NOT NULL,              -- e.g. '1', '2'
    topic_name VARCHAR(200) NOT NULL,          -- e.g. 'Mental Health & Wellbeing'
    avg_percentage NUMERIC(5,2) NOT NULL,      -- Average percentage of all students in that section
    participated_count INT NOT NULL DEFAULT 0, -- Total students who submitted
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_exam_section_topic UNIQUE(exam_id, batch, branch, section, topic_name)
);

-- =======================================================================
-- INDEXES FOR ULTRA-FAST QUERIES
-- =======================================================================
CREATE INDEX IF NOT EXISTS idx_students_branch_batch_sec ON students(branch, batch, section);
CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_options_question_id ON mcq_options(question_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_question_id ON test_cases(question_id);
CREATE INDEX IF NOT EXISTS idx_attempts_exam_student ON exam_attempts(exam_id, student_reg_no);
CREATE INDEX IF NOT EXISTS idx_attempts_student_reg_no ON exam_attempts(student_reg_no);
CREATE INDEX IF NOT EXISTS idx_survey_topic_exam_student ON survey_ai_topic_analysis(exam_id, student_reg_no);
CREATE INDEX IF NOT EXISTS idx_survey_topic_name ON survey_ai_topic_analysis(topic_name);
CREATE INDEX IF NOT EXISTS idx_section_analytics ON survey_section_topic_analytics(exam_id, branch, section, topic_name);

-- =======================================================================
-- INITIAL DEFAULT SEED DATA (Default Admin Only)
-- =======================================================================
-- Default Admin: username: admin, password: admin
INSERT INTO admins (username, password_hash, name, role)
VALUES ('admin', 'admin', 'System Administrator', 'admin')
ON CONFLICT (username) DO NOTHING;

