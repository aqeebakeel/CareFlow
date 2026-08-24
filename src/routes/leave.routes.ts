import { Router } from 'express';
import { createDoctorLeaveController } from '../controllers/leave.controller.js';
import { authenticateJwt, requireRole } from '../middlewares/auth.middleware.js';

export const leaveRouter = Router();
leaveRouter.post('/', authenticateJwt, requireRole('ADMIN'), createDoctorLeaveController);