import express from "express";
import { getRecommendationsByPet } from "../controllers/recommendationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Route to get recommendations grouped by each of the user's pets
router.get("/pets", protect, getRecommendationsByPet);

export default router;
