import jwt from "jsonwebtoken";
import User from "../models/user.js";
import ContactMessage from "../models/contactMessage.js";
import { sendTransactionalEmail } from "../services/emailService.js";

const getUserFromToken = async (authorizationHeader) => {
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  try {
    const token = authorizationHeader.split(" ")[1];
    const decoded = jwt.verify(token, "secretkey");
    const user = await User.findById(decoded.id).select("_id");
    return user || null;
  } catch (error) {
    return null;
  }
};

export const createContactMessage = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({
        message: "Name, email, and message are required",
      });
    }

    const user = await getUserFromToken(req.headers.authorization);

    const contactMessage = await ContactMessage.create({
      user: user?._id || null,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      message: message.trim(),
    });

    const supportEmail = process.env.CONTACT_SUPPORT_EMAIL || process.env.SMTP_FROM_EMAIL;

    if (supportEmail) {
      try {
        await sendTransactionalEmail({
          to: supportEmail,
          subject: `New Contact Us message from ${name.trim()}`,
          text: [
            "A new contact message was submitted in PetXHub.",
            `Name: ${name.trim()}`,
            `Email: ${email.trim().toLowerCase()}`,
            "",
            "Message:",
            message.trim(),
          ].join("\n"),
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
              <h2 style="margin: 0 0 12px;">New Contact Message</h2>
              <p><strong>Name:</strong> ${name.trim()}</p>
              <p><strong>Email:</strong> ${email.trim().toLowerCase()}</p>
              <p><strong>Message:</strong><br/>${message.trim().replace(/\n/g, "<br/>")}</p>
            </div>
          `,
        });
      } catch (emailError) {
        console.error("Contact message email notification failed:", emailError.message);
      }
    }

    res.status(201).json({
      message: "Message submitted successfully",
      contactMessage,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const getContactMessages = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        message: "Not authorized to view contact messages",
      });
    }

    const messages = await ContactMessage.find()
      .populate("user", "name email role")
      .sort({ createdAt: -1 });

    res.json({ messages });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

export const updateContactMessageStatus = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        message: "Not authorized to update contact messages",
      });
    }

    const { status } = req.body;

    if (!["new", "reviewed", "resolved", "in-progress"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status value",
      });
    }

    const message = await ContactMessage.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        message: "Contact message not found",
      });
    }

    message.status = status;
    await message.save();

    res.json({
      message: "Contact message status updated",
      contactMessage: message,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
