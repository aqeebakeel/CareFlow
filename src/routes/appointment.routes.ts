import { Router } from 'express';
import { completeAppointmentController, confirmAppointmentController, createAppointmentHoldController } from '../controllers/appointment.controller.js';
import { authenticateJwt, requireRole } from '../middlewares/auth.middleware.js';

export const appointmentRouter = Router();
appointmentRouter.post('/', authenticateJwt, requireRole('PATIENT'), createAppointmentHoldController);
appointmentRouter.post('/:id/confirm', authenticateJwt, requireRole('PATIENT'), confirmAppointmentController);
appointmentRouter.post('/:id/complete', authenticateJwt, requireRole('DOCTOR'), completeAppointmentController);