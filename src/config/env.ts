import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function positiveInteger(name: string, fallback: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: positiveInteger('PORT', 3000),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  timezone: process.env.TIMEZONE ?? 'UTC',
  geminiApiKey: process.env.GEMINI_API_KEY ?? '',
  geminiModel: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash',
  geminiApiBaseUrl: process.env.GEMINI_API_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta',
  llmTimeoutMs: positiveInteger('LLM_TIMEOUT_MS', 8000),
  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: positiveInteger('SMTP_PORT', 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPassword: process.env.SMTP_PASSWORD ?? '',
  emailFrom: process.env.EMAIL_FROM ?? '',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? '',
  googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN ?? '',
  googleCalendarId: process.env.GOOGLE_CALENDAR_ID ?? 'primary',
  outboxPollCron: process.env.OUTBOX_POLL_CRON ?? '* * * * *',
  reminderCron: process.env.REMINDER_CRON ?? '0 9 * * *',
  outboxMaxRetries: positiveInteger('OUTBOX_MAX_RETRIES', 3),
  slotHoldMinutes: positiveInteger('SLOT_HOLD_MINUTES', 5)
} as const;