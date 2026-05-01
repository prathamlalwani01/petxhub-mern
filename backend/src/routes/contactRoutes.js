import express from "express";
import {
  createContactMessage,
  getContactMessages,
  updateContactMessageStatus,
} from "../controllers/contactController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", createContactMessage);
router.get("/", protect, getContactMessages);
router.patch("/:id/status", protect, updateContactMessageStatus);

export default router;
