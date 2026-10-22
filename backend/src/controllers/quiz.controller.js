
import mongoose from "mongoose";
import { z } from "zod";

import Document from "../models/Document.js";
import DocumentChunk from "../models/DocumentChunk.js";
import Quiz from "../models/Quiz.js";
import QuizAttempt from "../models/QuizAttempt.js";

import { generateDocumentQuiz } from "../services/quiz.service.js";



const generateQuizSchema = z.object({
  questionCount: z.coerce.number().int().min(1).max(20).default(5),
});

const submitQuizSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      selectedIndex: z
        .number()
        .int()
        .min(0)
        .max(3)
        .nullable(),
    })
  ).min(1).max(20),
});

const sendValidationError = (res, error) => {
  return res.status(400).json({
    success: false,
    message: "Validation failed.",
    errors: error.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    })),
  });
};

// POST /api/v1/documents/:id/quizzes
export const generateQuiz = async (req, res, next) => {
  try {
    // 1. Validate the requested number of questions.
    const parsed = generateQuizSchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }

    // 2. Check that the document belongs to the logged-in user.
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID.",
      });
    }

    const document = await Document.findOne({
      _id: id,
      owner: req.user._id,
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    // 3. Load the document's extracted text in order.
    const chunks = await DocumentChunk.find({
      document: document._id,
      owner: req.user._id,
    })
      .select("chunkIndex content")
      .sort({ chunkIndex: 1 })
      .lean();

    if (chunks.length === 0) {
      return res.status(422).json({
        success: false,
        message: "This document has no extractable text for quiz generation.",
      });
    }

    // 4. Generate questions with our existing AI service.
    const questions = await generateDocumentQuiz(
      chunks,
      parsed.data.questionCount
    );

    // 5. Save the quiz in MongoDB.
    const title = `${document.originalName.replace(/\.[^.]+$/, "")} Quiz`;

    const quiz = await Quiz.create({
      owner: req.user._id,
      document: document._id,
      title,
      questions,
    });

    // 6. Do not expose correct answers before submission.
    const safeQuestions = quiz.questions.map((question) => ({
      _id: question._id,
      question: question.question,
      options: question.options,
    }));

    return res.status(201).json({
      success: true,
      message: "Quiz generated successfully.",
      data: {
        quiz: {
          _id: quiz._id,
          document: quiz.document,
          title: quiz.title,
          questions: safeQuestions,
          questionCount: quiz.questions.length,
          createdAt: quiz.createdAt,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

 // GET /api/v1/documents/:id/quizzes
export const listQuizzes = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Validate the document ID.
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID.",
      });
    }

    // 2. Verify that this document belongs to the logged-in user.
    const document = await Document.findOne({
      _id: id,
      owner: req.user._id,
    }).select("_id");

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    // 3. Retrieve this user's quizzes for this document.
    const quizzes = await Quiz.find({
      owner: req.user._id,
      document: document._id,
    })
      .select("title questions createdAt")
      .sort({ createdAt: -1 })
      .lean();

    // 4. Return list information, not the answer keys.
    const safeQuizzes = quizzes.map((quiz) => ({
      _id: quiz._id,
      title: quiz.title,
      questionCount: quiz.questions.length,
      createdAt: quiz.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        quizzes: safeQuizzes,
      },
    });
  } catch (error) {
    return next(error);
  }
};

 // GET /api/v1/documents/:id/quizzes/:quizId
export const getQuizById = async (req, res, next) => {
  try {
    const { id, quizId } = req.params;

    // 1. Validate both IDs.
    if (
      !mongoose.isValidObjectId(id) ||
      !mongoose.isValidObjectId(quizId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid document or quiz ID.",
      });
    }

    // 2. Verify document ownership.
    const document = await Document.findOne({
      _id: id,
      owner: req.user._id,
    }).select("_id");

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    // 3. Find the quiz belonging to this user and document.
    const quiz = await Quiz.findOne({
      _id: quizId,
      document: document._id,
      owner: req.user._id,
    }).lean();

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found.",
      });
    }

    // 4. Send questions and options, but hide answer keys.
    const safeQuestions = quiz.questions.map((question) => ({
      _id: question._id,
      question: question.question,
      options: question.options,
      difficulty: question.difficulty,
    }));

    return res.status(200).json({
      success: true,
      data: {
        quiz: {
          _id: quiz._id,
          document: quiz.document,
          title: quiz.title,
          questions: safeQuestions,
          questionCount: safeQuestions.length,
          createdAt: quiz.createdAt,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

 // POST /api/v1/documents/:id/quizzes/:quizId/attempts
export const submitQuiz = async (req, res, next) => {
  try {
    // 1. Validate the submitted answers.
    const parsed = submitQuizSchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }

    const { id, quizId } = req.params;

    // 2. Validate the document and quiz IDs.
    if (
      !mongoose.isValidObjectId(id) ||
      !mongoose.isValidObjectId(quizId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid document or quiz ID.",
      });
    }

    // 3. Verify that the user owns the document.
    const document = await Document.findOne({
      _id: id,
      owner: req.user._id,
    }).select("_id");

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    // 4. Load the quiz belonging to this user and document.
    const quiz = await Quiz.findOne({
      _id: quizId,
      document: document._id,
      owner: req.user._id,
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        message: "Quiz not found.",
      });
    }

    // 5. Match each submitted answer to a real question.
    const submittedAnswers = new Map();

    for (const answer of parsed.data.answers) {
      if (!mongoose.isValidObjectId(answer.questionId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid question ID.",
        });
      }

      if (submittedAnswers.has(answer.questionId)) {
        return res.status(400).json({
          success: false,
          message: "A question cannot be submitted more than once.",
        });
      }

      submittedAnswers.set(
        answer.questionId,
        answer.selectedIndex
      );
    }

    const questionIds = new Set(
      quiz.questions.map((question) =>
        String(question._id)
      )
    );

    for (const questionId of submittedAnswers.keys()) {
      if (!questionIds.has(questionId)) {
        return res.status(400).json({
          success: false,
          message: "The submission contains a question that does not belong to this quiz.",
        });
      }
    }

    // 6. Calculate the answers on the server.
    const reviewedAnswers = quiz.questions.map((question) => {
      const questionId = String(question._id);
      const selectedIndex = submittedAnswers.has(questionId)
        ? submittedAnswers.get(questionId)
        : null;

      const isCorrect =
        selectedIndex !== null &&
        selectedIndex === question.correctIndex;

      return {
        questionId: question._id,
        question: question.question,
        options: [...question.options],
        selectedIndex,
        correctIndex: question.correctIndex,
        isCorrect,
        explanation: question.explanation,
      };
    });

    const correctCount = reviewedAnswers.filter(
      (answer) => answer.isCorrect
    ).length;

    const totalQuestions = quiz.questions.length;

    const scorePercentage = Math.round(
      (correctCount / totalQuestions) * 100
    );

    // 7. Save the attempt in MongoDB.
    const attempt = await QuizAttempt.create({
      owner: req.user._id,
      document: document._id,
      quiz: quiz._id,
      answers: reviewedAnswers,
      correctCount,
      totalQuestions,
      scorePercentage,
      submittedAt: new Date(),
    });

    // 8. Return the result and detailed answer review.
    return res.status(201).json({
      success: true,
      message: "Quiz submitted successfully.",
      data: {
        attempt: {
          _id: attempt._id,
          quiz: quiz._id,
          document: document._id,
          title: quiz.title,
          correctCount: attempt.correctCount,
          totalQuestions: attempt.totalQuestions,
          scorePercentage: attempt.scorePercentage,
          submittedAt: attempt.submittedAt,
          answers: attempt.answers,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/documents/:id/quizzes/:quizId/attempts/:attemptId
export const getQuizAttemptById = async (req, res, next) => {
  try {
    const { id, quizId, attemptId } = req.params;

    // 1. Validate all IDs.
    if (
      !mongoose.isValidObjectId(id) ||
      !mongoose.isValidObjectId(quizId) ||
      !mongoose.isValidObjectId(attemptId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid document, quiz, or attempt ID.",
      });
    }

    // 2. Confirm the document belongs to this user.
    const document = await Document.findOne({
      _id: id,
      owner: req.user._id,
    }).select("_id");

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    // 3. Retrieve only this user's attempt for this quiz.
    const attempt = await QuizAttempt.findOne({
      _id: attemptId,
      owner: req.user._id,
      document: document._id,
      quiz: quizId,
    }).lean();

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: "Quiz attempt not found.",
      });
    }

    // 4. Return the saved score and detailed review.
    return res.status(200).json({
      success: true,
      data: {
        attempt: {
          _id: attempt._id,
          quiz: attempt.quiz,
          document: attempt.document,
          correctCount: attempt.correctCount,
          totalQuestions: attempt.totalQuestions,
          scorePercentage: attempt.scorePercentage,
          submittedAt: attempt.submittedAt,
          answers: attempt.answers,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};