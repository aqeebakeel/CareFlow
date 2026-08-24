CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE "UserRole" AS ENUM ('PATIENT', 'DOCTOR', 'ADMIN');
CREATE TYPE "AppointmentStatus" AS ENUM ('HELD', 'CONFIRMED', 'CANCELLED', 'COMPLETED');
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'PROCESSING', 'FAILED', 'COMPLETED');
CREATE TYPE "JobTaskType" AS ENUM ('SEND_EMAIL', 'SEND_CALENDAR_INVITE', 'RETRY_PRE_VISIT_SUMMARY', 'RETRY_POST_VISIT_SUMMARY', 'NOTIFY_LEAVE_CANCELLATION');

CREATE TABLE "User" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "email" CITEXT NOT NULL, "fullName" TEXT NOT NULL,
  "role" "UserRole" NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE TABLE "DoctorProfile" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "userId" UUID NOT NULL, "specialisation" TEXT NOT NULL,
  "workingHours" JSONB NOT NULL, "slotDurationMin" INTEGER NOT NULL DEFAULT 30,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DoctorProfile_pkey" PRIMARY KEY ("id"), CONSTRAINT "DoctorProfile_userId_key" UNIQUE ("userId"),
  CONSTRAINT "DoctorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "Leave" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "doctorProfileId" UUID NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL, "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "Leave_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Leave_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "DoctorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Leave_doctorProfileId_startsAt_endsAt_idx" ON "Leave"("doctorProfileId", "startsAt", "endsAt");

CREATE TABLE "Appointment" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "patientId" UUID NOT NULL, "doctorId" UUID NOT NULL, "doctorProfileId" UUID NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL, "endsAt" TIMESTAMP(3) NOT NULL, "status" "AppointmentStatus" NOT NULL DEFAULT 'HELD',
  "holdExpiresAt" TIMESTAMP(3), "symptoms" TEXT, "preVisitSummary" TEXT, "postVisitSummary" TEXT,
  "rawClinicalNotes" TEXT, "cancellationReason" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Appointment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Appointment_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Appointment_doctorProfileId_fkey" FOREIGN KEY ("doctorProfileId") REFERENCES "DoctorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Appointment_doctorProfileId_startsAt_idx" ON "Appointment"("doctorProfileId", "startsAt");
CREATE INDEX "Appointment_doctorId_startsAt_idx" ON "Appointment"("doctorId", "startsAt");
CREATE INDEX "Appointment_patientId_startsAt_idx" ON "Appointment"("patientId", "startsAt");
CREATE INDEX "Appointment_status_holdExpiresAt_idx" ON "Appointment"("status", "holdExpiresAt");
CREATE UNIQUE INDEX "active_appointment_slot" ON "Appointment"("doctorProfileId", "startsAt") WHERE "status" IN ('HELD', 'CONFIRMED');

CREATE TABLE "JobOutbox" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(), "taskType" "JobTaskType" NOT NULL,
  "status" "JobStatus" NOT NULL DEFAULT 'PENDING', "payload" JSONB NOT NULL, "retryCount" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "lastError" TEXT, "lockedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "JobOutbox_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "JobOutbox_status_availableAt_idx" ON "JobOutbox"("status", "availableAt");
