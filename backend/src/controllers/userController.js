import bcrypt from "bcryptjs";
import User from "../models/user.js";
import { generateOtp, getOtpExpiryDate, hashOtp, sendPasswordResetOtpEmail } from "../services/otpService.js";

export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const { name, email, phone, password, passwordOtp } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });

      if (existingUser && existingUser._id.toString() !== user._id.toString()) {
        return res.status(400).json({ message: "Email is already in use" });
      }
    }

    user.name = name ?? user.name;
    user.email = email ?? user.email;
    user.phone = phone ?? user.phone;

    if (password) {
      if (
        !passwordOtp ||
        !user.passwordResetOTP ||
        !user.passwordResetOTPExpires ||
        user.passwordResetOTPExpires < new Date()
      ) {
        return res.status(400).json({ message: "Password OTP is required or has expired" });
      }

      if (hashOtp(passwordOtp) !== user.passwordResetOTP) {
        return res.status(400).json({ message: "Invalid password OTP" });
      }

      user.password = await bcrypt.hash(password, 10);
      user.passwordResetOTP = undefined;
      user.passwordResetOTPExpires = undefined;
    }

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        accountStatus: user.accountStatus,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const sendProfilePasswordOtp = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

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

    res.json({ message: "Password update OTP sent to your email" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllUsersForAdmin = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const users = await User.find()
      .select("name email phone role accountStatus isEmailVerified createdAt")
      .sort({ createdAt: -1 });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserByAdmin = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { role, accountStatus, isEmailVerified } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (role && !["user", "provider", "admin"].includes(role)) {
      return res.status(400).json({ message: "Invalid role value" });
    }

    if (accountStatus && !["active", "suspended"].includes(accountStatus)) {
      return res.status(400).json({ message: "Invalid account status value" });
    }

    if (user._id.toString() === req.user._id.toString() && accountStatus === "suspended") {
      return res.status(400).json({ message: "You cannot suspend your own admin account" });
    }

    user.role = role ?? user.role;
    user.accountStatus = accountStatus ?? user.accountStatus;
    if (typeof isEmailVerified === "boolean") {
      user.isEmailVerified = isEmailVerified;
    }

    await user.save();

    res.json({
      message: "User updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        accountStatus: user.accountStatus,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
