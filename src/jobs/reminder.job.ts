import cron from 'node-cron';
import { AppointmentStatus, JobTaskType } from '@prisma/client';
import { env } from '../config/env.js';
import { prisma } from '../utils/prisma.js';

export function startMedicationReminderJob(): void {
  cron.schedule(env.reminderCron, async () => {
    const appointments = await prisma.appointment.findMany({
      where: { status: AppointmentStatus.COMPLETED, postVisitSummary: { contains: 'Medication schedule:' } },
      select: { id: true, postVisitSummary: true }
    });
    const tasks = appointments.flatMap((appointment) => extractDailyMedications(appointment.postVisitSummary ?? '').map((medication) => ({ taskType: JobTaskType.SEND_MEDICATION_REMINDER, payload: { appointmentId: appointment.id, medication, reminderDate: new Date().toISOString().slice(0, 10) } })));
    if (tasks.length) await prisma.jobOutbox.createMany({ data: tasks });
  }, { timezone: env.timezone, noOverlap: true });
}

function extractDailyMedications(summary: string): string[] {
  const section = summary.match(/Medication schedule:\n([\s\S]*?)(?:\n\nFollow-up steps:|$)/)?.[1] ?? '';
  return section.split('\n').map((line) => line.replace(/^[-*]\s*/, '').trim()).filter((line) => line && /\b(daily|once daily|twice daily|every day|every morning|every evening)\b/i.test(line));
}