import { google } from 'googleapis';
import { env } from '../config/env.js';

type CalendarAppointmentDetails = { id: string; startsAt: Date; endsAt: Date; patientEmail: string; patientName: string; doctorEmail: string; doctorName: string; symptoms?: string | null };

export async function createCalendarEvent(appointment: CalendarAppointmentDetails): Promise<string> {
  console.log(`[MOCK CALENDAR] Event created for appointment ID: ${appointment.id}`);
  return `mock-event-${appointment.id}`;
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  console.log(`[MOCK CALENDAR] Event deleted for event ID: ${eventId}`);
}