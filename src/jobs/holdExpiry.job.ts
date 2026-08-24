import cron from 'node-cron';
import { env } from '../config/env.js';
import { releaseExpiredHolds } from '../services/appointment.service.js';

export function startHoldExpiryJob(): void {
  cron.schedule('* * * * *', async () => {
    await releaseExpiredHolds();
  }, { timezone: env.timezone, noOverlap: true });
}