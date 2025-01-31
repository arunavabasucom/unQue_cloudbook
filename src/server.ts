import express, { type Application } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import bookingRoutes from "./routes/booking";

// Load environment variables
dotenv.config();

// Initialize Express App
const app: Application = express();
app.use(cors());
app.use(helmet());
app.use(express.json());

//  Register Routes
app.use("/auth", authRoutes);
app.use("/booking", bookingRoutes);

// Start Server (Only if not in a test environment)
const PORT = process.env.PORT || 6000;
if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

//  Export app for testing
export default app;
