import { JobStatus } from '@prisma/client';
import { env } from '../../config/env.js';
import { prisma } from '../../utils/prisma.js';

export async function processOutboxJob(jobId: string): Promise<void> {
  const claim = await prisma.jobOutbox.updateMany({ where: { id: jobId, status: JobStatus.PENDING }, data: { status: JobStatus.PROCESSING, lockedAt: new Date() } });
  if (claim.count !== 1) return;
  try {
    // Provider-specific email, calendar, and LLM retry handlers belong here.
    await prisma.jobOutbox.update({ where: { id: jobId }, data: { status: JobStatus.COMPLETED, completedAt: new Date(), lastError: null } });
  } catch (error) {
    const job = await prisma.jobOutbox.findUniqueOrThrow({ where: { id: jobId } });
    const retryCount = job.retryCount + 1;
    await prisma.jobOutbox.update({
      where: { id: jobId },
      data: {
        status: retryCount >= env.outboxMaxRetries ? JobStatus.FAILED : JobStatus.PENDING,
        retryCount,
        lastError: error instanceof Error ? error.message : 'Unknown job error',
        availableAt: new Date(Date.now() + retryCount * 60_000),
        lockedAt: null
      }
    });
  }
}
