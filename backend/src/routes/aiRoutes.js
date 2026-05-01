import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  askPetCareAssistant,
  createPetCareReminderFromAssistant,
  getPetCareAssistantHistory,
  savePetCareAssistantNote,
} from "../controllers/aiController.js";

const router = express.Router();

router.post("/pet-care", protect, askPetCareAssistant);
router.get("/pet-care/history/:petId", protect, getPetCareAssistantHistory);
router.post("/pet-care/save-note", protect, savePetCareAssistantNote);
router.post("/pet-care/create-reminder", protect, createPetCareReminderFromAssistant);

export default router;
