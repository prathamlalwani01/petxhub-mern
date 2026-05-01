import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getAdminAnalytics } from "../controllers/analyticsController.js";

const router = express.Router();

router.get("/admin/overview", protect, getAdminAnalytics);

export default router;
