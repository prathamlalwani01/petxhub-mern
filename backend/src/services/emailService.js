import nodemailer from "nodemailer";

const ensureEmailConfig = () => {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_PORT ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS ||
    !process.env.SMTP_FROM_EMAIL
  ) {
    throw new Error("SMTP email configuration is missing");
  }
};

const getTransporter = () => {
  ensureEmailConfig();

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

export const sendTransactionalEmail = async ({ to, subject, text, html }) => {
  if (!to) {
    throw new Error("Recipient email is required");
  }

  const transporter = getTransporter();

  await transporter.sendMail({
    from: process.env.SMTP_FROM_EMAIL,
    to: Array.isArray(to) ? to.join(", ") : to,
    subject,
    text,
    html,
  });
};
