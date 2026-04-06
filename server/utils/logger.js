const fs = require('fs');
const path = require('path');

const logsDir = path.resolve(__dirname, '..', '..', 'logs');
const backendLogPath = path.join(logsDir, 'backend.log');

const ensureLogFile = () => {
  fs.mkdirSync(logsDir, { recursive: true });

  if (!fs.existsSync(backendLogPath)) {
    fs.writeFileSync(backendLogPath, '', 'utf8');
  }
};

const formatMeta = (meta) => {
  if (!meta) {
    return '';
  }

  const serialized = Object.entries(meta)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join(' ');

  return serialized ? ` ${serialized}` : '';
};

const writeLog = (level, message, meta) => {
  ensureLogFile();

  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}${formatMeta(meta)}`;

  fs.appendFileSync(backendLogPath, `${line}\n`, 'utf8');

  if (level === 'error') {
    console.error(line);
    return;
  }

  console.log(line);
};

module.exports = {
  backendLogPath,
  info: (message, meta) => writeLog('info', message, meta),
  warn: (message, meta) => writeLog('warn', message, meta),
  error: (message, meta) => writeLog('error', message, meta)
};
