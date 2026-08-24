import { Router } from 'express';
import { getDoctors, createDoctor } from '../controllers/doctor.controller.js';
import { authenticateJwt, requireRole } from '../middlewares/auth.middleware.js';

export const doctorRouter = Router();

doctorRouter.get('/', authenticateJwt, getDoctors);
doctorRouter.post('/', authenticateJwt, requireRole('ADMIN'), createDoctor);
