import cron from 'node-cron';
import { JobStatus } from '@prisma/client';
import { env } from '../config/env.js';
import { processOutboxJob } from './handlers/outbox.handler.js';
import { prisma } from '../utils/prisma.js';

export function startOutboxWorker(): void {
  cron.schedule(env.outboxPollCron, async () => {
    const jobs = await prisma.jobOutbox.findMany({ where: { status: JobStatus.PENDING, availableAt: { lte: new Date() } }, take: 20, orderBy: { createdAt: 'asc' } });
    for (const job of jobs) await processOutboxJob(job.id);
  }, { timezone: env.timezone, noOverlap: true });
}
