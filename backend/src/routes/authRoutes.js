import express from "express";
import {
  forgotPassword,
  loginUser,
  registerUser,
  resendVerificationOtp,
  resetPasswordWithOtp,
  verifyEmailOtp,
} from "../controllers/authController.js";

const router=express.Router();

router.post('/register',registerUser);
router.post('/login',loginUser);
router.post("/verify-email", verifyEmailOtp);
router.post("/resend-verification-otp", resendVerificationOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPasswordWithOtp);

export default router;
