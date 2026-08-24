# Healthcare Appointment & Follow-up Manager

**Live Demo:** [https://careflowv1.netlify.app](https://careflowv1.netlify.app)

**Author:** Aqeeb Akeel | **Registration:** 23BLC1040 | **Campus:** VIT Chennai

## Overview

A high-performance, event-driven healthcare appointment platform engineered with separate portals for patients, doctors, and administrators. This system goes beyond basic CRUD operations by tackling real-world concurrency challenges—employing database-level pessimistic locking to prevent double-booking, automated conflict resolution for doctor scheduling, and a transactional outbox pattern to guarantee notification and AI reliability.

Powered by Google Gemini for clinical summarization and Google Workspace for seamless scheduling, the architecture is built for fault tolerance.

---

## 🏗️ System Architecture & Data Flow

```text
[ Patient / Doctor / Admin Portals ]
               │
      (React + Vite + Tailwind)
               │
               ▼
   [ Express.js API Gateway ] ────( JWT Auth & RBAC )────┐
               │                                         │
     (Serializable Booking Tx)                           │
               │                                         ▼
               ▼                                [ JobOutbox Worker ]
   [ PostgreSQL (Supabase) ] ◄──(Read/Write)──►  - 1-min Cron Polling
    - Partial Unique Indexes                     - Idempotent Retry Engine
    - Appointments & Holds                               │
    - Doctor Profiles & Leaves                     ┌─────┴─────┐
                                                   ▼           ▼
                                          [ Google Gemini ]  [ Calendar & SMTP ]
                                           - Pre-visit LLM    - OAuth 2.0 Sync
                                           - Post-visit LLM   - Email Alerts

```

## 🔥 Key Features (Evaluation Focus)

* **Double-Booking Prevention:** Utilizes PostgreSQL serializable transactions and a partial unique index to definitively reject concurrent slot bookings at the database level.


* **Leave Management:** Automatically cancels overlapping appointments and queues atomic cancellation notifications when an admin marks a doctor on leave.


* **Notification Reliability:** Email and Calendar tasks are decoupled from the main API thread using a durable `JobOutbox` table and a cron-driven retry worker to handle network failures seamlessly.


* **LLM Graceful Degradation:** Gemini requests use strict timeouts. If the AI fails, the system safely degrades by saving raw symptoms/notes, confirming the appointment, and dispatching a background retry task to the outbox queue.



## 🔄 The 5-Minute Slot Hold Lifecycle

To prevent race conditions while giving patients time to detail their symptoms, the system enforces a strict transactional state machine:

```text
(Patient Selects Slot) 
          │
          ▼
    [ HELD (5-Min Lock) ] ──(Cron Sweeps > 5m)──► [ EXPIRED (Slot Freed) ]
          │
 (Patient Submits Symptoms)
          │
          ▼
    [ CONFIRMED ] ──(Admin Sets Leave)──► [ CANCELLED_BY_DOCTOR ]
          │
 (Doctor Submits Notes)
          │
          ▼
    [ COMPLETED ] ──(Cron Sweeps Daily)──► [ MEDICATION_REMINDERS_QUEUED ]

```

---

## 🛠️ Setup Guide

### Prerequisites

* Node.js (v18+)
* PostgreSQL (or Supabase account)
* Google Cloud Console Account (for Calendar API OAuth)
* Google AI Studio Account (for Gemini API)

### Installation

1. Clone the repository and ensure you are on the `main` branch. Note: Ensure no unnecessary files like `node_modules` or `.env` are committed.


2. Install dependencies:
```bash
npm install

```


3. Set up your environment variables (see `.env.example` below).


4. Apply the database schema and generate the Prisma client:
```bash
npx prisma generate
npx prisma db push

```


5. Start the backend server (initializes the Express API, outbox processor, and reminder cron jobs):


```bash
npm run dev

```


6. In a separate terminal, navigate to the `/frontend` directory and start the Vite application:
```bash
cd frontend
npm run dev

```



---

## 🔐 Environment Variables (`.env.example`)

Create a `.env` file in the root directory:

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:password@host:5432/postgres"

# Authentication
JWT_SECRET="your_secure_jwt_secret"

# LLM Integration
GEMINI_API_KEY="your_gemini_api_key_here"

# Email Configuration (Nodemailer/SMTP)
SMTP_USER="your_email@gmail.com"
SMTP_PASSWORD="your_16_char_app_password"

# Google Calendar OAuth 2.0
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"
GOOGLE_REFRESH_TOKEN="your_google_refresh_token"

```

---

## 📅 Google Calendar Setup Steps

To enable automated Google Calendar event synchronization:

1. Go to the **Google Cloud Console** and create a new project.
2. Navigate to **APIs & Services > Library** and enable the **Google Calendar API**.


3. Go to **Credentials**, click **Create Credentials > OAuth client ID** (select Web Application). Note your `Client ID` and `Client Secret`.


4. To generate a long-lived `Refresh Token`, use the **Google OAuth 2.0 Playground**:
* Click the settings gear and check "Use your own OAuth credentials", pasting your ID and Secret.
* In Step 1, select the Google Calendar API v3 scope (`[https://www.googleapis.com/auth/calendar](https://www.googleapis.com/auth/calendar)`).
* Click "Authorize APIs", log in, and proceed to Step 2 to exchange the authorization code for a `Refresh Token`.


5. Add all three credentials to your `.env` file.

---

## 🧠 Exact LLM Prompts Used

The system integrates Google Gemini (`gemini-1.5-flash`) utilizing the exact prompts required by the system specifications:

* **Pre-visit Summary:**
> "Analyse these symptoms and return: urgency level (Low / Medium / High), chief complaint, and three suggested questions for the doctor. Symptoms: "
> 
> 


* **Post-visit Summary:**
> "Convert these clinical notes into a patient-friendly summary with medication schedule and follow-up steps: "
> 
> 



---

## 🗄️ Database Schema (Prisma)

The relational structure is designed for high concurrency. Key models include:

* **User:** Manages authentication and the `Role` enum (PATIENT, DOCTOR, ADMIN).


* **DoctorProfile:** Links to a Doctor User. Contains `specialisation`, JSON-structured `workingHours`, and `slotDuration`.


* **Leave:** Tracks blackout dates for doctors, triggering atomic conflict resolution.


* **Appointment:** Manages the core reservation lifecycle. Includes relations to Patient and Doctor, `startTime`, `status`, `symptoms`, `preVisitSummary`, `clinicalNotes`, and `postVisitSummary`.


* **JobOutbox:** A durable queue table storing asynchronous tasks (`taskType`, `payload`, `status`, `retryCount`) ensuring no emails or calendar syncs are lost during server downtime.



---

## 🚀 API Documentation

*All protected routes require a valid JWT Bearer token.*

### Admin Routes

* `POST /api/doctors`: Create a new doctor profile (specialisation, working hours, slot duration).


* `POST /api/leaves`: Mark a doctor on leave. Triggers backend conflict resolution (cancels overlapping appointments and queues cancellation emails).



### Patient Routes

* `GET /api/doctors`: Fetch available doctors by specialisation.


* `POST /api/appointments`: Request a slot. Database locks the slot and returns a `HELD` appointment ID.


* `POST /api/appointments/:id/confirm`: Submit symptoms for a `HELD` slot. Triggers the pre-visit LLM summary, updates state to `CONFIRMED`, and safely queues email/calendar events.



### Doctor Routes

* `GET /api/appointments`: Retrieve the daily schedule and pre-visit AI summaries.


* `POST /api/appointments/:id/complete`: Submit clinical notes. Triggers the post-visit LLM summary, generates the medication schedule, and queues daily patient reminders.
