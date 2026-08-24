import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

type AppointmentEmailDetails = { patientEmail: string; patientName: string; doctorName: string; startsAt: Date; cancellationReason?: string | null };

let testAccount: nodemailer.TestAccount | null = null;
let transporter: nodemailer.Transporter | null = null;

async function getTransporter() {
  if (transporter) return transporter;
  if (!testAccount) {
    testAccount = await nodemailer.createTestAccount();
    console.log('Created Ethereal test account:', testAccount.user);
  }
  transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: { user: testAccount.user, pass: testAccount.pass }
  });
  return transporter;
}

async function sendAndLogMail(options: nodemailer.SendMailOptions) {
  const t = await getTransporter();
  const info = await t.sendMail(options);
  const testUrl = nodemailer.getTestMessageUrl(info);
  if (testUrl) {
    console.log(`Test Email URL: ${testUrl}`);
  }
}

export async function sendBookingConfirmation(details: AppointmentEmailDetails): Promise<void> {
  await sendAndLogMail({ from: env.emailFrom || 'test@example.com', to: details.patientEmail, subject: 'Appointment confirmed', text: `Hello ${details.patientName}, your appointment with ${details.doctorName} is confirmed for ${details.startsAt.toISOString()}.` });
}

export async function sendCancellationNotice(details: AppointmentEmailDetails): Promise<void> {
  await sendAndLogMail({ from: env.emailFrom || 'test@example.com', to: details.patientEmail, subject: 'Appointment cancelled', text: `Hello ${details.patientName}, your appointment with ${details.doctorName} on ${details.startsAt.toISOString()} was cancelled. Reason: ${details.cancellationReason ?? 'Doctor unavailable'}.` });
}

export async function sendMedicationReminder(patientEmail: string, patientName: string, medication: string): Promise<void> {
  await sendAndLogMail({ from: env.emailFrom || 'test@example.com', to: patientEmail, subject: 'Medication reminder', text: `Hello ${patientName}, this is your medication reminder: ${medication}` });
}