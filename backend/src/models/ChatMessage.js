
import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 12000,
    },

    // Chunk numbers used to prepare the assistant's answer.
    sourceChunks: {
      type: [Number],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

chatMessageSchema.index({
  owner: 1,
  document: 1,
  createdAt: -1,
});

const ChatMessage = mongoose.model(
  "ChatMessage",
  chatMessageSchema
);

export default ChatMessage;
