import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getAllUsersForAdmin,
  getProfile,
  sendProfilePasswordOtp,
  updateProfile,
  updateUserByAdmin,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/profile", protect, getProfile);
router.post("/profile/password-otp", protect, sendProfilePasswordOtp);
router.put("/profile", protect, updateProfile);
router.get("/admin/all", protect, getAllUsersForAdmin);
router.patch("/admin/:id", protect, updateUserByAdmin);

export default router;
