const { execSync } = require('child_process');

function isDockerAvailable() {
  try {
    execSync('docker --version', { stdio: 'pipe', timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

function isRunnerImageAvailable() {
  try {
    const output = execSync('docker images -q vignan-mastery-runner', { stdio: 'pipe', timeout: 3000 }).toString();
    return output.trim().length > 0;
  } catch {
    return false;
  }
}

module.exports = {
  isDockerAvailable,
  isRunnerImageAvailable
};
