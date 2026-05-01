import express from "express";
import {
  addHealthRecord,
  completeHealthReminder,
  getMyReminders,
  getPetHealthRecords,
  deleteHealthRecord,
  updateHealthRecord
} from "../controllers/healthController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, addHealthRecord);
router.patch("/:id/complete", protect, completeHealthReminder);
router.get("/reminders/all", protect, getMyReminders);
router.get("/:petId", protect, getPetHealthRecords);
router.delete("/:id", protect, deleteHealthRecord);
router.put("/:id", protect, updateHealthRecord);

export default router;
