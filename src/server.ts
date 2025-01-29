import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth";
import bookingRoutes from "./routes/booking";

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());

app.use("/auth", authRoutes);
app.use("/booking", bookingRoutes);

const PORT = process.env.PORT || 5800;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
