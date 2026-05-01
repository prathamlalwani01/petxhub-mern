import OpenAI from "openai";
import Pet from "../models/pet.js";
import HealthRecord from "../models/healthRecords.js";
import Booking from "../models/booking.js";
import AIConversation from "../models/aiConversation.js";
import { formatReminder } from "./healthController.js";

const DEFAULT_REMINDER_CHANNELS = {
  inApp: true,
  browser: true,
  email: true,
  sms: false,
  whatsapp: false,
};

const getOpenRouterClient = () => {
  if (!process.env.OPENROUTER_API_KEY) {
    return null;
  }

  return new OpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:5173",
      "X-Title": process.env.OPENROUTER_APP_NAME || "PetXHub",
    },
  });
};

const formatPetContext = ({ pet, healthRecords, bookings }) => {
  const recentHealth = healthRecords.slice(0, 8).map((record) => ({
    type: record.type,
    title: record.title,
    description: record.description || "",
    date: record.date,
    reminderEnabled: record.reminderEnabled,
    reminderDate: record.reminderDate,
    reminderStatus: record.reminderStatus || null,
  }));

  const recentBookings = bookings.slice(0, 5).map((booking) => ({
    category: booking.bookingCategory,
    service: booking.service?.name || null,
    appointmentType: booking.appointmentType || null,
    groomingPackage: booking.groomingPackage || null,
    bookingDate: booking.bookingDate,
    timeSlot: booking.timeSlot,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
  }));

  return {
    pet: {
      name: pet.name,
      breed: pet.breed,
      age: pet.age,
      gender: pet.gender,
      weight: pet.weight,
      medicalNotes: pet.medicalNotes || "",
      location: pet.location || "",
    },
    recentHealth,
    recentBookings,
  };
};

const inferSuggestedActions = ({ question, reply }) => {
  const combined = `${question} ${reply}`.toLowerCase();
  const actions = [];

  const addAction = (id, label) => {
    if (!actions.some((action) => action.id === id)) {
      actions.push({ id, label });
    }
  };

  addAction("SAVE_NOTE", "Save to Health Notes");
  addAction("CREATE_REMINDER", "Create Reminder");

  if (
    /(urgent|vomit|vomiting|diarrhea|diarrhoea|bleeding|seizure|breathing|fever|not eating|emergency|pain)/.test(
      combined
    )
  ) {
    addAction("BOOK_VET", "Book Vet Care");
  }

  if (/(vaccine|vaccination|medication|deworm|reminder|follow-up|follow up|booster)/.test(combined)) {
    addAction("OPEN_HEALTH", "Open Health Records");
  }

  if (/(groom|coat|bath|tick|flea|spa|haircut)/.test(combined)) {
    addAction("OPEN_GROOMING", "Book Grooming");
  }

  if (/(booking|appointment|visit|reschedule|slot)/.test(combined)) {
    addAction("OPEN_BOOKINGS", "View My Bookings");
  }

  addAction("OPEN_SERVICES", "Open Services");

  return actions.slice(0, 3);
};

export const askPetCareAssistant = async (req, res) => {
  try {
    const { petId, message } = req.body;

    if (!petId || !message?.trim()) {
      return res.status(400).json({
        message: "Pet and message are required",
      });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({
        message: "OpenRouter is not configured",
      });
    }

    const pet = await Pet.findById(petId);

    if (!pet) {
      return res.status(404).json({
        message: "Pet not found",
      });
    }

    if (pet.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorized to access this pet",
      });
    }

    const [healthRecords, bookings] = await Promise.all([
      HealthRecord.find({ pet: petId }).sort({ date: -1, createdAt: -1 }),
      Booking.find({ pet: petId })
        .populate("service", "name")
        .sort({ bookingDate: -1, createdAt: -1 }),
    ]);

    const client = getOpenRouterClient();
    const context = formatPetContext({ pet, healthRecords, bookings });
    const completion = await client.chat.completions.create({
      model: process.env.OPENROUTER_MODEL || "openai/gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You are PetXHub AI Pet Care Assistant. Provide practical, calm, non-alarmist pet care guidance. Do not claim to diagnose or replace a veterinarian. If symptoms suggest urgency, clearly say to seek veterinary care quickly. Use the provided pet profile, health records, and booking history as context. Format the answer with short labeled sections exactly like: Summary, Urgency, What You Can Do Now, Suggested Next Step.",
        },
        {
          role: "user",
          content: `Pet context:\n${JSON.stringify(context, null, 2)}\n\nUser question:\n${message.trim()}`,
        },
      ],
      temperature: 0.3,
      max_tokens: Number(process.env.OPENROUTER_MAX_TOKENS || 800),
    });

    const reply = completion.choices?.[0]?.message?.content?.trim();
    const finalReply = reply || "I could not generate a response right now. Please try again.";
    const actions = inferSuggestedActions({
      question: message.trim(),
      reply: finalReply,
    });

    await AIConversation.create({
      user: req.user._id,
      pet: pet._id,
      question: message.trim(),
      answer: finalReply,
      actions,
    });

    return res.json({
      reply: finalReply,
      actions,
      pet: {
        id: pet._id,
        name: pet.name,
      },
    });
  } catch (error) {
    console.error("AI assistant error:", error);
    return res.status(500).json({
      message: error.message || "Unable to get AI response right now",
    });
  }
};

export const getPetCareAssistantHistory = async (req, res) => {
  try {
    const { petId } = req.params;

    const pet = await Pet.findById(petId);

    if (!pet) {
      return res.status(404).json({
        message: "Pet not found",
      });
    }

    if (pet.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorized to access this pet",
      });
    }

    const history = await AIConversation.find({
      user: req.user._id,
      pet: petId,
    })
      .sort({ createdAt: -1 })
      .limit(30);

    return res.json({
      pet: {
        id: pet._id,
        name: pet.name,
      },
      history: history.reverse(),
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

export const savePetCareAssistantNote = async (req, res) => {
  try {
    const { petId, title, summary, question, answer } = req.body;

    if (!petId || !summary?.trim()) {
      return res.status(400).json({
        message: "Pet and summary are required",
      });
    }

    const pet = await Pet.findById(petId);

    if (!pet) {
      return res.status(404).json({
        message: "Pet not found",
      });
    }

    if (pet.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorized to access this pet",
      });
    }

    const record = await HealthRecord.create({
      pet: pet._id,
      type: "note",
      title: title?.trim() || "AI Assistant Note",
      description: [
        question ? `Question: ${question.trim()}` : null,
        `Summary: ${summary.trim()}`,
        answer ? `Assistant: ${answer.trim()}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      date: new Date(),
      reminderEnabled: false,
      reminderDate: null,
      reminderNote: "",
      reminderChannels: DEFAULT_REMINDER_CHANNELS,
      recurrence: {
        enabled: false,
        frequency: "yearly",
        interval: 1,
      },
    });

    return res.status(201).json({
      message: "Assistant note saved to health records",
      record: formatReminder(record),
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};

export const createPetCareReminderFromAssistant = async (req, res) => {
  try {
    const { petId, title, description, reminderDate, reminderNote } = req.body;

    if (!petId || !reminderDate) {
      return res.status(400).json({
        message: "Pet and reminder date are required",
      });
    }

    const pet = await Pet.findById(petId);

    if (!pet) {
      return res.status(404).json({
        message: "Pet not found",
      });
    }

    if (pet.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Not authorized to access this pet",
      });
    }

    const record = await HealthRecord.create({
      pet: pet._id,
      type: "care",
      title: title?.trim() || "AI Care Follow-up",
      description: description?.trim() || "",
      date: new Date(),
      reminderEnabled: true,
      reminderDate,
      reminderNote: reminderNote?.trim() || "",
      reminderChannels: DEFAULT_REMINDER_CHANNELS,
      recurrence: {
        enabled: false,
        frequency: "yearly",
        interval: 1,
      },
    });

    return res.status(201).json({
      message: "Reminder created from assistant advice",
      record: formatReminder(record),
    });
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
};
