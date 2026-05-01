import User from '../models/user.js';
import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken";
import {
  generateOtp,
  getOtpExpiryDate,
  hashOtp,
  sendPasswordResetOtpEmail,
  sendVerificationOtpEmail,
} from "../services/otpService.js";

const sanitizeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  accountStatus: user.accountStatus,
  isEmailVerified: user.isEmailVerified,
});

//register controller 
export const registerUser=async(req,res)=>{
    console.log(req.body);
    try{
        const {name,email,password,phone,role}=req.body;
        const normalizedPhone = typeof phone === "string" ? phone.trim() : "";

        if (normalizedPhone && !/^\d{10}$/.test(normalizedPhone)) {
            return res.status(400).json({ message: "Phone number must be exactly 10 digits" });
        }

        //checks if user exists 
        const userExists =await User.findOne({email});

        if(userExists){
            return res.status(400).json({message:"User already exist"})
        }

        // hash password
        const hashedPassword=await bcrypt.hash(password,10);

        //create user 
        const verificationOtp = generateOtp();

        const user=await User.create({
            name,
            email,
            password:hashedPassword,
            phone: normalizedPhone || undefined,
            role:role || "user",
            isEmailVerified:false,
            emailVerificationOTP: hashOtp(verificationOtp),
            emailVerificationOTPExpires: getOtpExpiryDate(),
        });

        await sendVerificationOtpEmail({
          to: user.email,
          name: user.name,
          otp: verificationOtp,
        });

        res.status(201).json({
            message:"User registered successfully. Please verify your email with the OTP sent to your inbox.",
            user: sanitizeUser(user)
        })

    }catch(error){
        res.status(500).json({message:"Server Error",error:error.message});
    }
}

//login controller 
export const loginUser = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      const user = await User.findOne({ email });
  
      if (!user) {
        return res.status(400).json({
          message: "User Not Found"
        });
      }
  
      const isMatch = await bcrypt.compare(password, user.password);
  
      if (!isMatch) {
        return res.status(400).json({
          message: "Invalid Password"
        });
      }

      if (user.accountStatus === "suspended") {
        return res.status(403).json({
          message: "Your account is suspended. Please contact support.",
          code: "ACCOUNT_SUSPENDED",
        });
      }

      if (!user.isEmailVerified) {
        return res.status(403).json({
          message: "Please verify your email before logging in",
          code: "EMAIL_NOT_VERIFIED",
          email: user.email,
        });
      }
  
      const token = jwt.sign(
        { id: user._id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
  
      res.json({
        message: "Login Successful",
        token,
        user: sanitizeUser(user)
      });
  
    } catch (error) {
      res.status(500).json({
        message: error.message
      });
    }
  };

export const verifyEmailOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isEmailVerified) {
      return res.json({
        message: "Email already verified",
        user: sanitizeUser(user),
      });
    }

    if (
      !user.emailVerificationOTP ||
      !user.emailVerificationOTPExpires ||
      user.emailVerificationOTPExpires < new Date()
    ) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    if (hashOtp(otp) !== user.emailVerificationOTP) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.isEmailVerified = true;
    user.emailVerificationOTP = undefined;
    user.emailVerificationOTPExpires = undefined;
    await user.save();

    res.json({
      message: "Email verified successfully",
      user: sanitizeUser(user),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resendVerificationOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email is already verified" });
    }

    const verificationOtp = generateOtp();
    user.emailVerificationOTP = hashOtp(verificationOtp);
    user.emailVerificationOTPExpires = getOtpExpiryDate();
    await user.save();

    await sendVerificationOtpEmail({
      to: user.email,
      name: user.name,
      otp: verificationOtp,
    });

    res.json({ message: "Verification OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetOtp = generateOtp();
    user.passwordResetOTP = hashOtp(resetOtp);
    user.passwordResetOTPExpires = getOtpExpiryDate();
    await user.save();

    await sendPasswordResetOtpEmail({
      to: user.email,
      name: user.name,
      otp: resetOtp,
    });

    res.json({ message: "Password reset OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const resetPasswordWithOtp = async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (
      !user.passwordResetOTP ||
      !user.passwordResetOTPExpires ||
      user.passwordResetOTPExpires < new Date()
    ) {
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    if (hashOtp(otp) !== user.passwordResetOTP) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    user.password = await bcrypt.hash(password, 10);
    user.passwordResetOTP = undefined;
    user.passwordResetOTPExpires = undefined;
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
