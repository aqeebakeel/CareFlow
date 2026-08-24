import type { Request, Response } from 'express';
import { completeAppointmentWithNotes, confirmAppointmentWithSymptoms, createAppointmentHold } from '../services/appointment.service.js';

type BookingBody = {
  patientId?: string;
  doctorProfileId?: string;
  startsAt?: string;
  endsAt?: string;
  symptoms?: string;
};

export async function createAppointmentHoldController(request: Request<unknown, unknown, BookingBody>, response: Response): Promise<void> {
  try {
    const { patientId, doctorProfileId, startsAt, endsAt, symptoms } = request.body;
    if (!patientId || !doctorProfileId || !startsAt || !endsAt) {
      response.status(400).json({ error: 'patientId, doctorProfileId, startsAt, and endsAt are required.' });
      return;
    }

    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      response.status(400).json({ error: 'startsAt and endsAt must be valid ISO-8601 dates.' });
      return;
    }

    const appointment = await createAppointmentHold({ patientId, doctorProfileId, startsAt: start, endsAt: end, symptoms });
    response.status(201).json(appointment);
  } catch (error) {
    response.status(409).json({ error: error instanceof Error ? error.message : 'Unable to hold this appointment slot.' });
  }
}
type ConfirmBookingBody = { patientId?: string; symptoms?: string };

export async function confirmAppointmentController(request: Request<{ id: string }, unknown, ConfirmBookingBody>, response: Response): Promise<void> {
  try {
    const { patientId, symptoms } = request.body;
    if (!patientId || !symptoms) {
      response.status(400).json({ error: 'patientId and symptoms are required.' });
      return;
    }

    const result = await confirmAppointmentWithSymptoms(request.params.id, patientId, symptoms);
    response.status(200).json(result);
  } catch (error) {
    response.status(409).json({ error: error instanceof Error ? error.message : 'Unable to confirm this appointment.' });
  }
}
type CompleteAppointmentBody = { doctorId?: string; clinicalNotes?: string };

export async function completeAppointmentController(request: Request<{ id: string }, unknown, CompleteAppointmentBody>, response: Response): Promise<void> {
  try {
    const { doctorId, clinicalNotes } = request.body;
    if (!doctorId || !clinicalNotes) {
      response.status(400).json({ error: 'doctorId and clinicalNotes are required.' });
      return;
    }
    response.status(200).json(await completeAppointmentWithNotes({ appointmentId: request.params.id, doctorId, clinicalNotes }));
  } catch (error) {
    response.status(409).json({ error: error instanceof Error ? error.message : 'Unable to complete this appointment.' });
  }
}