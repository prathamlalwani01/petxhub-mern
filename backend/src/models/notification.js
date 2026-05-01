import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  type: {
    type: String,
    enum: ["reminder", "booking", "adoption"],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: "info"
  },
  actionPath: {
    type: String,
    required: true
  },
  relatedModel: {
    type: String
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId
  },
  dedupeKey: {
    type: String
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  }
}, { timestamps: true });

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ user: 1, dedupeKey: 1 }, { unique: true, sparse: true });

export default mongoose.model("Notification", notificationSchema);
