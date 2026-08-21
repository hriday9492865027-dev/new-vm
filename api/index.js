const express = require('express');
const cors = require('cors');
const { executeCode } = require('../backend/executor');
const { LANGUAGES, getLanguageStatus } = require('../backend/languages');
const { Pool } = require('pg');

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database connection helper for Vercel / Cloud PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL,
  ssl: (process.env.DATABASE_URL || process.env.POSTGRES_URL) ? { rejectUnauthorized: false } : undefined,
});

// Compile endpoint
app.post('/api/compile', async (req, res) => {
  const startTime = Date.now();
  try {
    const { language, files, stdin, code } = req.body;
    const srcCode = code || (files && files.length > 0 ? files[0].content : '');
    const input = stdin || '';

    if (!language || !srcCode) {
      return res.status(400).json({
        run: { stdout: '', stderr: 'Missing language or code', code: 1 },
        message: 'Missing language or code'
      });
    }

    const langKey = language.toLowerCase().replace(/[^a-z+]/g, '').replace('c++', 'cpp');
    const result = await executeCode(langKey, srcCode, input, 5000);

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
    return res.status(500).json({
      run: { stdout: '', stderr: err.message, code: 1 },
      message: err.message
    });
  }
});

// Root /compile endpoint
app.post('/compile', async (req, res) => {
  const startTime = Date.now();
  try {
    const { language, code, input, timeout } = req.body;
    const langKey = (language || '').toLowerCase().replace(/[^a-z+]/g, '').replace('c++', 'cpp');
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
    return res.status(500).json({
      success: false,
      output: '',
      error: err.message,
      executionTime: Date.now() - startTime
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    environment: 'vercel-serverless',
    timestamp: new Date().toISOString()
  });
});

module.exports = app;
