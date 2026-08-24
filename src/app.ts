import express from 'express';
import { healthRouter } from './routes/health.routes.js';
import { appointmentRouter } from './routes/appointment.routes.js';
import { leaveRouter } from './routes/leave.routes.js';
import { doctorRouter } from './routes/doctor.routes.js';

export const app = express();
app.use(express.json());
app.use('/health', healthRouter);
app.use('/appointments', appointmentRouter);
app.use('/leaves', leaveRouter);
app.use('/doctors', doctorRouter);
