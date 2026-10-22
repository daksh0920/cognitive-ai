import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const quizQuestionSchema = new Schema(
  {
    question: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    options: {
      type: [
        {
          type: String,
          required: true,
          trim: true,
          maxlength: 500,
        },
      ],
      required: true,
      validate: {
        validator: (options) =>
          Array.isArray(options) &&
          options.length === 4 &&
          options.every(Boolean),
        message:
          "Each question must have exactly four non-empty options.",
      },
    },

    correctIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
    },

    explanation: {
      type: String,
      default: "",
      maxlength: 2000,
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "easy",
    },
  },
  { _id: true }
);

const quizSchema = new Schema(
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

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },

    questions: {
      type: [quizQuestionSchema],
      required: true,
      validate: {
        validator: (questions) =>
          Array.isArray(questions) &&
          questions.length >= 1 &&
          questions.length <= 20,
        message:
          "A quiz must contain between 1 and 20 questions.",
      },
    },
  },
  { timestamps: true }
);

quizSchema.index({
  owner: 1,
  document: 1,
  createdAt: -1,
});

export default models.Quiz || model("Quiz", quizSchema);