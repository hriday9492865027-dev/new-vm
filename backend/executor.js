const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { LANGUAGES } = require('./languages');

async function executeCode(langKey, code, input = '', timeout = 5000) {
  const lang = LANGUAGES[langKey];
  if (!lang) {
    return {
      success: false,
      output: '',
      error: `Unsupported language: ${langKey}`,
      executionTime: 0
    };
  }

  const startTime = Date.now();
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vm-code-'));
  const fileName = (lang.needsClassName ? 'Main' : 'solution') + lang.extension;
  const filePath = path.join(tempDir, fileName);

  fs.writeFileSync(filePath, code, 'utf-8');

  try {
    let runCommand;
    let runArgs = [];

    if (langKey === 'python') {
      runCommand = 'python';
      runArgs = [filePath];
    } else if (langKey === 'javascript') {
      runCommand = 'node';
      runArgs = [filePath];
    } else if (langKey === 'c') {
      const outPath = path.join(tempDir, 'solution.exe');
      const comp = spawn('gcc', [filePath, '-o', outPath, '-lm']);
      await new Promise((res, rej) => {
        comp.on('close', code => code === 0 ? res() : rej(new Error('Compilation Error')));
      });
      runCommand = outPath;
    } else if (langKey === 'cpp') {
      const outPath = path.join(tempDir, 'solution.exe');
      const comp = spawn('g++', [filePath, '-o', outPath, '-lm']);
      await new Promise((res, rej) => {
        comp.on('close', code => code === 0 ? res() : rej(new Error('Compilation Error')));
      });
      runCommand = outPath;
    } else if (langKey === 'java') {
      const comp = spawn('javac', [filePath, '-d', tempDir]);
      await new Promise((res, rej) => {
        comp.on('close', code => code === 0 ? res() : rej(new Error('Compilation Error')));
      });
      runCommand = 'java';
      runArgs = ['-cp', tempDir, 'Main'];
    }

    return await new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const proc = spawn(runCommand, runArgs, {
        cwd: tempDir,
        timeout: timeout
      });

      if (input) {
        proc.stdin.write(input);
        proc.stdin.end();
      }

      proc.stdout.on('data', data => stdout += data.toString());
      proc.stderr.on('data', data => stderr += data.toString());

      const timer = setTimeout(() => {
        timedOut = true;
        try { proc.kill('SIGKILL'); } catch {}
      }, timeout);

      proc.on('close', (exitCode) => {
        clearTimeout(timer);
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
        resolve({
          success: exitCode === 0 && !timedOut,
          output: stdout,
          error: timedOut ? 'Execution Timed Out' : stderr,
          executionTime: Date.now() - startTime,
          timedOut
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
        resolve({
          success: false,
          output: stdout,
          error: err.message,
          executionTime: Date.now() - startTime,
          timedOut: false
        });
      });
    });

  } catch (err) {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch {}
    return {
      success: false,
      output: '',
      error: err.message,
      executionTime: Date.now() - startTime
    };
  }
}

module.exports = { executeCode };
