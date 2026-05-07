import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty' }
    : undefined,
  redact: ['password', 'passwordHash', 'token', 'accessToken', 'refreshToken', 'apiKey', 'anthropicKey'],
});
