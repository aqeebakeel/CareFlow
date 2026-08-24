import { AppointmentStatus, JobTaskType, Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma.js';

type CreateLeaveInput = { doctorProfileId: string; startsAt: Date; endsAt: Date; reason?: string };

export async function createDoctorLeave(input: CreateLeaveInput) {
  if (input.startsAt >= input.endsAt) throw new Error('Leave end time must be after its start time.');

  return prisma.$transaction(async (transaction) => {
    const leave = await transaction.leave.create({ data: input });
    const appointments = await transaction.appointment.findMany({
      where: { doctorProfileId: input.doctorProfileId, status: { in: [AppointmentStatus.HELD, AppointmentStatus.CONFIRMED] }, startsAt: { lt: input.endsAt }, endsAt: { gt: input.startsAt } },
      select: { id: true, patientId: true, calendarEventId: true }
    });

    if (appointments.length) {
      await transaction.appointment.updateMany({ where: { id: { in: appointments.map((appointment) => appointment.id) } }, data: { status: AppointmentStatus.CANCELLED_BY_DOCTOR, holdExpiresAt: null, cancellationReason: input.reason ?? 'Doctor unavailable' } });
      await transaction.jobOutbox.createMany({
        data: appointments.flatMap((appointment) => [
          { taskType: JobTaskType.SEND_CANCELLATION_EMAIL, payload: { appointmentId: appointment.id, patientId: appointment.patientId, leaveId: leave.id } },
          { taskType: JobTaskType.CANCEL_CALENDAR, payload: { appointmentId: appointment.id, eventId: appointment.calendarEventId } }
        ])
      });
    }
    return { leave, cancelledAppointmentCount: appointments.length };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}