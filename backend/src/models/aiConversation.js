import mongoose from "mongoose";

const aiConversationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Pet",
      required: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    answer: {
      type: String,
      required: true,
      trim: true,
    },
    actions: [
      {
        id: { type: String, trim: true },
        label: { type: String, trim: true },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("AIConversation", aiConversationSchema);
