import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { body, validationResult } from "express-validator";

const router = Router();
const prisma = new PrismaClient();
const SECRET = process.env.JWT_SECRET || "secret";

router.post(
  "/register",
  [
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
    body("role").isIn(["STUDENT", "PROFESSOR"]),
  ],
  async (req:any, res:any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const user = await prisma.user.create({
        data: { email, password: hashedPassword, role },
      });

      res.json({ message: "User registered", userId: user.id });
    } catch (error) {
      res.status(400).json({ error: "User already exists" });
    }
  }
);

router.post("/login", async (req:any, res:any) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, SECRET, { expiresIn: "1h" });
  res.json({ token });
});

export default router;
