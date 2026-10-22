
import mongoose from "mongoose";

const flashcardSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500,
  },

  answer: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000,
  },

  // One-based chunk numbers that support this card.
  sourceChunks: {
    type: [Number],
    default: [],
  },
});

const flashcardSetSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    cards: {
      type: [flashcardSchema],
      validate: {
        validator: (cards) => cards.length >= 1 && cards.length <= 30,
        message: "A flashcard set must contain 1–30 cards.",
      },
    },
  },
  {
    timestamps: true,
  }
);

flashcardSetSchema.index({
  owner: 1,
  document: 1,
  createdAt: -1,
});

const FlashcardSet = mongoose.model(
  "FlashcardSet",
  flashcardSetSchema
);

export default FlashcardSet;
