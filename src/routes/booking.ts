import { Router, type Response } from "express";
import { PrismaClient, type Slot } from "@prisma/client";
import { type AuthRequest, authMiddleware } from "../middleware/auth";

const router = Router();
const prisma = new PrismaClient();

// Professors Set Availability Slots
router.post("/slots", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== "PROFESSOR") {
      res.status(403).json({ error: "Only professors can create slots" });
      return;
    }

    const { time, duration }: { time: string; duration: number } = req.body;
    const endTime = new Date(new Date(time).getTime() + duration * 60000);

    const slot: Slot = await prisma.slot.create({
      data: {
        professorId: req.user.id,
        professorName: req.user.name,
        time: new Date(time),
        endTime,
        isBooked: false,
      },
    });

    res.json({ message: "Slot created", slot });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Students View Available Slots
router.get("/slots", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const slots = await prisma.slot.findMany({
      where: { isBooked: false },
      select: { id: true, time: true, endTime: true, professorName: true },
    });

    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Students Book an Appointment
router.post("/book", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== "STUDENT") {
      res.status(403).json({ error: "Only students can book appointments" });
      return;
    }

    const { slotId }: { slotId: string } = req.body;
    const slot = await prisma.slot.findUnique({ where: { id: slotId } });

    if (!slot || slot.isBooked) {
      res.status(400).json({ error: "Slot not available" });
      return;
    }

    await prisma.booking.create({
      data: { studentId: req.user.id, slotId },
    });

    await prisma.slot.update({ where: { id: slotId }, data: { isBooked: true } });

    res.json({ message: "Appointment booked" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Professors Cancel an Appointment
router.delete("/cancel/:slotId", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== "PROFESSOR") {
      res.status(403).json({ error: "Only professors can cancel appointments" });
      return;
    }

    const { slotId } = req.params;
    const booking = await prisma.booking.findUnique({ where: { slotId } });

    if (!booking) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }

    await prisma.booking.delete({ where: { slotId } });
    await prisma.slot.update({ where: { id: slotId }, data: { isBooked: false } });

    res.json({ message: "Appointment canceled" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Students Check Their Appointments
router.get("/appointments", authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const bookings = await prisma.booking.findMany({
      where: { studentId: req.user.id },
      include: { slot: true },
    });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
