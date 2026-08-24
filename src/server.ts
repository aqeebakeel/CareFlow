import { app } from './app.js';
import { env } from './config/env.js';
import { startHoldExpiryJob } from './jobs/holdExpiry.job.js';
import { startOutboxProcessorJob } from './jobs/outboxProcessor.job.js';
import { startMedicationReminderJob } from './jobs/reminder.job.js';

app.listen(env.port, () => {
  startHoldExpiryJob();
  startOutboxProcessorJob();
  startMedicationReminderJob();
  console.info(`API listening on port ${env.port}`);
});