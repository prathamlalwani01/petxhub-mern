import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "../src/routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import petRoutes from "./routes/petRoutes.js";
import serviceRoutes from "./routes/serviceRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import recommendationRoutes from "./routes/recommendationRoutes.js";
import adoptionRoutes from "./routes/adoptionRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import bookingSettingsRoutes from "./routes/bookingSettingsRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import { startReminderScheduler } from "./services/reminderService.js";
import { seedDefaultServices } from "./services/defaultServiceSeeder.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/pets", petRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/adoptions", adoptionRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/booking-settings", bookingSettingsRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/contact", contactRoutes);

app.get("/", (req, res) => {
  res.send("PetxHub API running...");
});

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await seedDefaultServices();
  startReminderScheduler();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
