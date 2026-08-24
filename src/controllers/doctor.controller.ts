import { Request, Response } from 'express';
import { prisma } from '../utils/prisma.js';
import { Role } from '@prisma/client';

export async function getDoctors(req: Request, res: Response): Promise<void> {
  try {
    const doctors = await prisma.user.findMany({
      where: { role: Role.DOCTOR },
      select: {
        id: true,
        email: true,
        fullName: true,
        doctorProfile: {
          select: {
            specialisation: true,
            workingHours: true,
            slotDurationMinutes: true,
          }
        }
      }
    });

    const response = doctors.map(doc => ({
      id: doc.id,
      email: doc.email,
      fullName: doc.fullName,
      specialisation: doc.doctorProfile?.specialisation,
      workingHours: doc.doctorProfile?.workingHours,
      slotDurationMinutes: doc.doctorProfile?.slotDurationMinutes,
    }));

    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
}

export async function createDoctor(req: Request, res: Response): Promise<void> {
  try {
    const { email, fullName, specialisation, workingHours, slotDurationMinutes } = req.body;

    if (!email || !fullName || !specialisation || !workingHours || !slotDurationMinutes) {
      res.status(400).json({ error: 'Missing required fields for doctor creation' });
      return;
    }

    const doctor = await prisma.user.create({
      data: {
        email,
        fullName,
        role: Role.DOCTOR,
        doctorProfile: {
          create: {
            specialisation,
            workingHours,
            slotDurationMinutes,
          }
        }
      },
      include: { doctorProfile: true }
    });

    res.status(201).json(doctor);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'User with this email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create doctor' });
    }
  }
}
