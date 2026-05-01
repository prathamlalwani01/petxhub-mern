import crypto from "crypto";
import { sendTransactionalEmail } from "./emailService.js";

const OTP_EXPIRY_MINUTES = 10;

export const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

export const hashOtp = (otp) =>
  crypto.createHash("sha256").update(String(otp)).digest("hex");

export const getOtpExpiryDate = () => {
  const expiry = new Date();
  expiry.setMinutes(expiry.getMinutes() + OTP_EXPIRY_MINUTES);
  return expiry;
};

export const sendVerificationOtpEmail = async ({ to, name, otp }) => {
  await sendTransactionalEmail({
    to,
    subject: "Verify your PetXHub email",
    text: `Hi ${name || "there"}, your PetXHub email verification OTP is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2>Verify your email</h2>
        <p>Hi ${name || "there"},</p>
        <p>Your PetXHub email verification OTP is:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${otp}</p>
        <p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
      </div>
    `,
  });
};

export const sendPasswordResetOtpEmail = async ({ to, name, otp }) => {
  await sendTransactionalEmail({
    to,
    subject: "Reset your PetXHub password",
    text: `Hi ${name || "there"}, your PetXHub password reset OTP is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
        <h2>Reset your password</h2>
        <p>Hi ${name || "there"},</p>
        <p>Your PetXHub password reset OTP is:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${otp}</p>
        <p>This code expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
      </div>
    `,
  });
};
