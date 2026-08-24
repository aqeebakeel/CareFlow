import cron from 'node-cron';
import { JobStatus, JobTaskType, Prisma } from '@prisma/client';
import { env } from '../config/env.js';
import { deleteCalendarEvent, createCalendarEvent } from '../services/calendar.service.js';
import { sendBookingConfirmation, sendCancellationNotice, sendMedicationReminder } from '../services/email.service.js';
import { analysePreVisitSymptoms, summarisePostVisitNotes } from '../services/llm.service.js';
import { prisma } from '../utils/prisma.js';

const maxJobsPerRun = 50;
type JobPayload = { appointmentId?: string; medication?: string };

export function startOutboxProcessorJob(): void {
  cron.schedule(env.outboxPollCron, async () => {
    const jobs = await prisma.jobOutbox.findMany({ where: { status: JobStatus.PENDING, availableAt: { lte: new Date() } }, orderBy: { createdAt: 'asc' }, take: maxJobsPerRun });
    for (const job of jobs) await processOutboxJob(job.id);
  }, { timezone: env.timezone, noOverlap: true });
}

async function processOutboxJob(jobId: string): Promise<void> {
  const claim = await prisma.jobOutbox.updateMany({ where: { id: jobId, status: JobStatus.PENDING }, data: { status: JobStatus.PROCESSING, lockedAt: new Date() } });
  if (claim.count !== 1) return;
  const job = await prisma.jobOutbox.findUniqueOrThrow({ where: { id: jobId } });
  try {
    switch (job.taskType) {
      case JobTaskType.SEND_CONFIRMATION_EMAIL: await sendConfirmationEmail(job.payload); break;
      case JobTaskType.SEND_CANCELLATION_EMAIL: await sendCancellationEmail(job.payload); break;
      case JobTaskType.SEND_MEDICATION_REMINDER: await sendReminderEmail(job.payload); break;
      case JobTaskType.SYNC_CALENDAR: await syncCalendar(job.payload); break;
      case JobTaskType.CANCEL_CALENDAR: await cancelCalendar(job.payload); break;
      case JobTaskType.LLM_RETRY_PRE_VISIT: await retryPreVisitSummary(job.payload); break;
      case JobTaskType.LLM_RETRY_POST_VISIT: await retryPostVisitSummary(job.payload); break;
      default: throw new Error(`Unsupported outbox task type: ${job.taskType}`);
    }
    await prisma.jobOutbox.update({ where: { id: jobId }, data: { status: JobStatus.COMPLETED, completedAt: new Date(), lockedAt: null, lastError: null } });
  } catch (error) {
    const retryCount = job.retryCount + 1;
    await prisma.jobOutbox.update({ where: { id: jobId }, data: { status: retryCount > env.outboxMaxRetries ? JobStatus.FAILED : JobStatus.PENDING, retryCount, lastError: error instanceof Error ? error.message : 'Unknown outbox processing error', availableAt: new Date(Date.now() + retryCount * 60_000), lockedAt: null } });
  }
}

async function sendConfirmationEmail(value: Prisma.JsonValue): Promise<void> { await sendBookingConfirmation(await getEmailAppointment(getAppointmentId(value))); }
async function sendCancellationEmail(value: Prisma.JsonValue): Promise<void> { await sendCancellationNotice(await getEmailAppointment(getAppointmentId(value))); }
async function sendReminderEmail(value: Prisma.JsonValue): Promise<void> {
  const payload = value as JobPayload;
  const appointment = await prisma.appointment.findUniqueOrThrow({ where: { id: getAppointmentId(value) }, include: { patient: { select: { email: true, fullName: true } } } });
  if (!payload.medication) throw new Error('Medication reminder payload is missing medication.');
  await sendMedicationReminder(appointment.patient.email, appointment.patient.fullName, payload.medication);
}

async function getEmailAppointment(appointmentId: string) {
  const appointment = await prisma.appointment.findUniqueOrThrow({ where: { id: appointmentId }, include: { patient: { select: { email: true, fullName: true } }, doctor: { select: { fullName: true } } } });
  return { patientEmail: appointment.patient.email, patientName: appointment.patient.fullName, doctorName: appointment.doctor.fullName, startsAt: appointment.startsAt, cancellationReason: appointment.cancellationReason };
}

async function syncCalendar(value: Prisma.JsonValue): Promise<void> {
  const appointmentId = getAppointmentId(value);
  const appointment = await prisma.appointment.findUniqueOrThrow({ where: { id: appointmentId }, include: { patient: { select: { email: true, fullName: true } }, doctor: { select: { email: true, fullName: true } } } });
  if (appointment.calendarEventId) return;
  const eventId = await createCalendarEvent({ id: appointment.id, startsAt: appointment.startsAt, endsAt: appointment.endsAt, patientEmail: appointment.patient.email, patientName: appointment.patient.fullName, doctorEmail: appointment.doctor.email, doctorName: appointment.doctor.fullName, symptoms: appointment.symptoms });
  await prisma.appointment.update({ where: { id: appointmentId }, data: { calendarEventId: eventId } });
}

async function cancelCalendar(value: Prisma.JsonValue): Promise<void> {
  const appointmentId = getAppointmentId(value);
  const appointment = await prisma.appointment.findUniqueOrThrow({ where: { id: appointmentId }, select: { calendarEventId: true } });
  if (!appointment.calendarEventId) return;
  await deleteCalendarEvent(appointment.calendarEventId);
  await prisma.appointment.update({ where: { id: appointmentId }, data: { calendarEventId: null } });
}

async function retryPreVisitSummary(value: Prisma.JsonValue): Promise<void> {
  const appointmentId = getAppointmentId(value); const appointment = await prisma.appointment.findUniqueOrThrow({ where: { id: appointmentId }, select: { symptoms: true } });
  if (!appointment.symptoms) throw new Error('Appointment has no symptoms to analyse.');
  const result = await analysePreVisitSymptoms(appointment.symptoms); if (!result.success) throw new Error('Pre-visit LLM retry failed.');
  const questions = result.data.suggestedQuestions.map((question, index) => `${index + 1}. ${question}`).join('\n');
  await prisma.appointment.update({ where: { id: appointmentId }, data: { preVisitSummary: `Urgency: ${result.data.urgencyLevel}\nChief complaint: ${result.data.chiefComplaint}\nSuggested questions:\n${questions}` } });
}

async function retryPostVisitSummary(value: Prisma.JsonValue): Promise<void> {
  const appointmentId = getAppointmentId(value); const appointment = await prisma.appointment.findUniqueOrThrow({ where: { id: appointmentId }, select: { rawClinicalNotes: true } });
  if (!appointment.rawClinicalNotes) throw new Error('Appointment has no clinical notes to summarise.');
  const result = await summarisePostVisitNotes(appointment.rawClinicalNotes); if (!result.success) throw new Error('Post-visit LLM retry failed.');
  const medications = result.data.medicationSchedule.length ? result.data.medicationSchedule.map((item) => `- ${item}`).join('\n') : '- None recorded'; const followUp = result.data.followUpSteps.length ? result.data.followUpSteps.map((item) => `- ${item}`).join('\n') : '- None recorded';
  await prisma.appointment.update({ where: { id: appointmentId }, data: { postVisitSummary: `Summary:\n${result.data.summary}\n\nMedication schedule:\n${medications}\n\nFollow-up steps:\n${followUp}` } });
}

function getAppointmentId(value: Prisma.JsonValue): string { const payload = value as JobPayload; if (!payload.appointmentId || typeof payload.appointmentId !== 'string') throw new Error('Outbox payload is missing appointmentId.'); return payload.appointmentId; }