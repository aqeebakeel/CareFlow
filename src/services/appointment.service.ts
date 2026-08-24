import { AppointmentStatus, JobTaskType, Prisma } from '@prisma/client';
import { env } from '../config/env.js';
import { analysePreVisitSymptoms, summarisePostVisitNotes } from './llm.service.js';
import { prisma } from '../utils/prisma.js';

type CreateHoldInput = {
  patientId: string;
  doctorProfileId: string;
  startsAt: Date;
  endsAt: Date;
  symptoms?: string;
};

type WorkingHours = Partial<Record<string, Array<{ start: string; end: string }>>>;

export async function createAppointmentHold(input: CreateHoldInput) {
  if (input.startsAt >= input.endsAt) throw new Error('The appointment end time must be after its start time.');

  const holdExpiresAt = new Date(Date.now() + env.slotHoldMinutes * 60_000);
  try {
    return await prisma.$transaction(async (transaction) => {
      const doctorProfile = await transaction.doctorProfile.findUnique({
        where: { id: input.doctorProfileId },
        select: { userId: true, workingHours: true, slotDurationMin: true }
      });
      if (!doctorProfile) throw new Error('Doctor profile was not found.');

      validateSlotWithinWorkingHours(input.startsAt, input.endsAt, doctorProfile.workingHours, doctorProfile.slotDurationMin);
      const leave = await transaction.leave.findFirst({ where: { doctorProfileId: input.doctorProfileId, startsAt: { lt: input.endsAt }, endsAt: { gt: input.startsAt } } });
      if (leave) throw new Error('Doctor is unavailable during this time.');

      const conflict = await transaction.appointment.findFirst({
        where: { doctorProfileId: input.doctorProfileId, status: { in: [AppointmentStatus.HELD, AppointmentStatus.CONFIRMED] }, startsAt: { lt: input.endsAt }, endsAt: { gt: input.startsAt } },
        select: { id: true }
      });
      if (conflict) throw new Error('This slot is no longer available.');

      return transaction.appointment.create({ data: { ...input, doctorId: doctorProfile.userId, status: AppointmentStatus.HELD, holdExpiresAt } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(error.code)) throw new Error('This slot is no longer available.');
    throw error;
  }
}

export async function confirmAppointmentWithSymptoms(appointmentId: string, patientId: string, symptoms: string) {
  if (!symptoms.trim()) throw new Error('Symptoms are required to confirm this appointment.');

  const heldAppointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, patientId, status: AppointmentStatus.HELD, holdExpiresAt: { gt: new Date() } },
    select: { id: true }
  });
  if (!heldAppointment) throw new Error('Appointment hold is missing or has expired.');

  const llmResult = await analysePreVisitSymptoms(symptoms);
  const preVisitSummary = llmResult.success ? formatPreVisitSummary(llmResult.data) : symptoms;

  const appointment = await prisma.$transaction(async (transaction) => {
    const confirmation = await transaction.appointment.updateMany({
      where: { id: appointmentId, patientId, status: AppointmentStatus.HELD, holdExpiresAt: { gt: new Date() } },
      data: { status: AppointmentStatus.CONFIRMED, holdExpiresAt: null, symptoms, preVisitSummary }
    });
    if (confirmation.count !== 1) throw new Error('Appointment hold is missing or has expired.');

    await transaction.jobOutbox.createMany({ data: [
      { taskType: JobTaskType.SEND_CONFIRMATION_EMAIL, payload: { appointmentId } },
      { taskType: JobTaskType.SYNC_CALENDAR, payload: { appointmentId } }
    ] });
    if (!llmResult.success) {
      await transaction.jobOutbox.create({ data: { taskType: JobTaskType.LLM_RETRY_PRE_VISIT, payload: { appointmentId } } });
    }
    return transaction.appointment.findUniqueOrThrow({ where: { id: appointmentId } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  return { appointment, llmEnriched: llmResult.success };
}

export function releaseExpiredHolds() {
  return prisma.appointment.updateMany({ where: { status: AppointmentStatus.HELD, holdExpiresAt: { lte: new Date() } }, data: { status: AppointmentStatus.CANCELLED, cancellationReason: 'Hold expired', holdExpiresAt: null } });
}

function formatPreVisitSummary(analysis: { urgencyLevel: string; chiefComplaint: string; suggestedQuestions: string[] }): string {
  return `Urgency: ${analysis.urgencyLevel}\nChief complaint: ${analysis.chiefComplaint}\nSuggested questions:\n${analysis.suggestedQuestions.map((question, index) => `${index + 1}. ${question}`).join('\n')}`;
}

function validateSlotWithinWorkingHours(startsAt: Date, endsAt: Date, value: Prisma.JsonValue, slotDurationMin: number): void {
  if (endsAt.getTime() - startsAt.getTime() !== slotDurationMin * 60_000) throw new Error('Appointment duration must match the doctor slot duration.');
  const formatter = new Intl.DateTimeFormat('en-US', { timeZone: env.timezone, weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const startParts = partsAsMap(formatter.formatToParts(startsAt));
  const endParts = partsAsMap(formatter.formatToParts(endsAt));
  if (startParts.weekday !== endParts.weekday) throw new Error('Appointment must start and end on the same local day.');
  const windows = (value as WorkingHours)[startParts.weekday.toUpperCase()] ?? [];
  const startMinute = Number(startParts.hour) * 60 + Number(startParts.minute);
  const endMinute = Number(endParts.hour) * 60 + Number(endParts.minute);
  if (!windows.some((window) => startMinute >= parseTime(window.start) && endMinute <= parseTime(window.end))) throw new Error('Selected slot is outside the doctor working hours.');
}

function partsAsMap(parts: Intl.DateTimeFormatPart[]): Record<string, string> {
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
}

function parseTime(value: string): number {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error('Doctor working hours must use HH:mm values.');
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}
type CompleteAppointmentInput = { appointmentId: string; doctorId: string; clinicalNotes: string };

export async function completeAppointmentWithNotes(input: CompleteAppointmentInput) {
  if (!input.clinicalNotes.trim()) throw new Error('Clinical notes are required to complete this appointment.');

  const appointment = await prisma.appointment.findFirst({
    where: { id: input.appointmentId, doctorId: input.doctorId, status: AppointmentStatus.CONFIRMED },
    select: { id: true }
  });
  if (!appointment) throw new Error('Confirmed appointment not found for this doctor.');

  const llmResult = await summarisePostVisitNotes(input.clinicalNotes);
  const postVisitSummary = llmResult.success ? formatPostVisitSummary(llmResult.data) : input.clinicalNotes;

  const completedAppointment = await prisma.$transaction(async (transaction) => {
    const completion = await transaction.appointment.updateMany({
      where: { id: input.appointmentId, doctorId: input.doctorId, status: AppointmentStatus.CONFIRMED },
      data: { status: AppointmentStatus.COMPLETED, rawClinicalNotes: input.clinicalNotes, postVisitSummary }
    });
    if (completion.count !== 1) throw new Error('Appointment can no longer be completed.');

    if (!llmResult.success) {
      await transaction.jobOutbox.create({ data: { taskType: JobTaskType.LLM_RETRY_POST_VISIT, payload: { appointmentId: input.appointmentId } } });
    }
    return transaction.appointment.findUniqueOrThrow({ where: { id: input.appointmentId } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  return { appointment: completedAppointment, llmEnriched: llmResult.success };
}

function formatPostVisitSummary(summary: { summary: string; medicationSchedule: string[]; followUpSteps: string[] }): string {
  const medications = summary.medicationSchedule.length ? summary.medicationSchedule.map((item) => `- ${item}`).join('\n') : '- None recorded';
  const followUp = summary.followUpSteps.length ? summary.followUpSteps.map((item) => `- ${item}`).join('\n') : '- None recorded';
  return `Summary:\n${summary.summary}\n\nMedication schedule:\n${medications}\n\nFollow-up steps:\n${followUp}`;
}