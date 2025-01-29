import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const router = Router();
const prisma = new PrismaClient();

const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// Professors set availability
router.post("/slots", authMiddleware, async (req: any, res) => {
  if (req.user.role !== "PROFESSOR") return res.status(403).json({ error: "Access denied" });

  const { time } = req.body;
  const slot = await prisma.slot.create({
    data: { professorId: req.user.userId, time: new Date(time), isBooked: false },
  });

  res.json({ message: "Slot created", slot });
});

// Students view available slots
router.get("/slots", authMiddleware, async (req, res) => {
  const slots = await prisma.slot.findMany({ where: { isBooked: false } });
  res.json(slots);
});

// Students book an appointment
router.post("/book", authMiddleware, async (req: any, res) => {
  if (req.user.role !== "STUDENT") return res.status(403).json({ error: "Access denied" });

  const { slotId } = req.body;
  const slot = await prisma.slot.update({
    where: { id: slotId, isBooked: false },
    data: { isBooked: true, booking: { create: { studentId: req.user.userId } } },
  });

  res.json({ message: "Appointment booked", slot });
});

// Professors cancel an appointment
router.delete("/cancel/:id", authMiddleware, async (req: any, res) => {
  if (req.user.role !== "PROFESSOR") return res.status(403).json({ error: "Access denied" });

  const { id } = req.params;
  await prisma.booking.delete({ where: { slotId: id } });
  await prisma.slot.update({ where: { id }, data: { isBooked: false } });

  res.json({ message: "Appointment canceled" });
});

// Students check their appointments
router.get("/appointments", authMiddleware, async (req: any, res) => {
  const bookings = await prisma.booking.findMany({ where: { studentId: req.user.userId }, include: { slot: true } });
  res.json(bookings);
});

export default router;
