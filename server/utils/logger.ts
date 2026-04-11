import fs from 'node:fs';
import path from 'node:path';

const logsDir = path.resolve(__dirname, '..', '..', 'logs');
const backendLogPath = path.join(logsDir, 'backend.log');

const ensureLogFile = (): void => {
  fs.mkdirSync(logsDir, { recursive: true });

  if (!fs.existsSync(backendLogPath)) {
    fs.writeFileSync(backendLogPath, '', 'utf8');
  }
};

const formatMeta = (meta?: Record<string, unknown>): string => {
  if (!meta) {
    return '';
  }

  const serialized = Object.entries(meta)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join(' ');

  return serialized ? ` ${serialized}` : '';
};

const writeLog = (level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>): void => {
  ensureLogFile();

  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}${formatMeta(meta)}`;

  fs.appendFileSync(backendLogPath, `${line}\n`, 'utf8');

  const consoleMethod = level === 'error'
    ? console.error
    : level === 'warn'
      ? console.warn
      : console.log;

  try {
    consoleMethod(line);
  } catch (error) {
    // Keep file logging as the reliable fallback if console output fails.
  }
};

const logger = {
  backendLogPath,
  info: (message: string, meta?: Record<string, unknown>) => writeLog('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => writeLog('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => writeLog('error', message, meta)
};

export = logger;
