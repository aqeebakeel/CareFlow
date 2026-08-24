import type { Request, Response } from 'express';
import { createDoctorLeave } from '../services/leave.service.js';

type LeaveBody = { doctorProfileId?: string; startsAt?: string; endsAt?: string; reason?: string };

export async function createDoctorLeaveController(request: Request<unknown, unknown, LeaveBody>, response: Response): Promise<void> {
  try {
    const { doctorProfileId, startsAt, endsAt, reason } = request.body;
    if (!doctorProfileId || !startsAt || !endsAt) {
      response.status(400).json({ error: 'doctorProfileId, startsAt, and endsAt are required.' });
      return;
    }
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      response.status(400).json({ error: 'startsAt and endsAt must be valid ISO-8601 dates.' });
      return;
    }
    response.status(201).json(await createDoctorLeave({ doctorProfileId, startsAt: start, endsAt: end, reason }));
  } catch (error) {
    response.status(409).json({ error: error instanceof Error ? error.message : 'Unable to create doctor leave.' });
  }
}