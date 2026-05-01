import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getBookingSettings,
  updateBookingSettings,
} from "../controllers/bookingSettingsController.js";

const router = express.Router();

router.get("/", protect, getBookingSettings);
router.put("/", protect, updateBookingSettings);

export default router;
