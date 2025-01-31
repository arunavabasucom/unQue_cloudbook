import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient, type User, Role } from "@prisma/client";
import { body, validationResult } from "express-validator";

const router = Router();
const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "secret";

// Define Request Body Types
interface AuthRequestBody {
  name?: string;
  email: string;
  password: string;
  role: Role;
}

// Register User
router.post(
  "/register",
  [
    body("name").isString(),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
    body("role").isIn(["STUDENT", "PROFESSOR"]),
  ],
  async (req: Request<{}, {}, AuthRequestBody>, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { name, email, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const user: User = await prisma.user.create({
        data: { name, email, password: hashedPassword, role },
      });

      res.json({ message: "User registered", userId: user.id });
    } catch (error) {
      res.status(400).json({ error: "User already exists" });
    }
  }
);

// Login User
router.post(
  "/login",
  async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;
    const user: User | null = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
  }
);

export default router;
