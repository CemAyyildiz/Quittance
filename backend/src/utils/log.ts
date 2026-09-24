type LogLevel = 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

const sanitise = (ctx: LogContext): LogContext => {
  const sanitised: LogContext = {};
  for (const [key, value] of Object.entries(ctx)) {
    if (/secret|password|token|key|auth/i.test(key)) {
      sanitised[key] = '[REDACTED]';
    } else {
      sanitised[key] = value;
    }
  }
  return sanitised;
};

const log = (level: LogLevel, message: string, ctx?: LogContext): void => {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...(ctx ? sanitise(ctx) : {}),
  };
  const stream = level === 'error' ? process.stderr : process.stdout;
  stream.write(JSON.stringify(entry) + '\n');
};

export const info = (message: string, ctx?: LogContext): void => log('info', message, ctx);
export const warn = (message: string, ctx?: LogContext): void => log('warn', message, ctx);
export const error = (message: string, ctx?: LogContext): void => log('error', message, ctx);

export default { info, warn, error };
