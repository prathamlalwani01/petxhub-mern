import mongoose from "mongoose";

const healthRecordSchema = new mongoose.Schema({
  pet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Pet",
    required: true
  },

  type: {
    type: String,
    enum: ["vaccination", "medication", "visit", "care", "note"],
    required: true
  },

  title: {
    type: String,
    required: true
  },

  description: {
    type: String
  },

  date: {
    type: Date,
    required: true
  },

  reminderEnabled: {
    type: Boolean,
    default: false
  },

  reminderDate: {
    type: Date
  },

  reminderNote: {
    type: String,
    trim: true
  },

  reminderCompleted: {
    type: Boolean,
    default: false
  },

  completedAt: {
    type: Date
  },

  lastCompletedAt: {
    type: Date
  },

  recurrence: {
    enabled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ["weekly", "monthly", "quarterly", "yearly"],
      default: "yearly"
    },
    interval: {
      type: Number,
      default: 1,
      min: 1
    }
  },

  reminderChannels: {
    inApp: {
      type: Boolean,
      default: true
    },
    browser: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: true
    },
    sms: {
      type: Boolean,
      default: false
    },
    whatsapp: {
      type: Boolean,
      default: false
    }
  },

  notificationLog: [
    {
      channel: {
        type: String,
        enum: ["email", "sms", "whatsapp"]
      },
      deliveryDateKey: {
        type: String
      },
      reminderStatus: {
        type: String,
        enum: ["due-soon", "overdue"]
      },
      status: {
        type: String,
        enum: ["sent", "failed"]
      },
      sentAt: {
        type: Date,
        default: Date.now
      },
      error: {
        type: String
      }
    }
  ]

}, { timestamps: true });

export default mongoose.model("HealthRecord", healthRecordSchema);
