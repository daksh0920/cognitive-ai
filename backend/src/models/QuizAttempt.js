
import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const answerSchema = new Schema(
  {
    questionId: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    question: {
      type: String,
      required: true,
    },

    options: {
      type: [String],
      required: true,
    },

    selectedIndex: {
      type: Number,
      default: null,
      min: 0,
      max: 3,
    },

    correctIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
    },

    isCorrect: {
      type: Boolean,
      required: true,
    },

    explanation: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const quizAttemptSchema = new Schema(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    document: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },

    quiz: {
      type: Schema.Types.ObjectId,
      ref: "Quiz",
      required: true,
      index: true,
    },

    answers: {
      type: [answerSchema],
      required: true,
    },

    correctCount: {
      type: Number,
      required: true,
      min: 0,
    },

    totalQuestions: {
      type: Number,
      required: true,
      min: 1,
    },

    scorePercentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },

    submittedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  { timestamps: true }
);

quizAttemptSchema.index({
  owner: 1,
  quiz: 1,
  submittedAt: -1,
});

export default
  models.QuizAttempt ||
  model("QuizAttempt", quizAttemptSchema);
