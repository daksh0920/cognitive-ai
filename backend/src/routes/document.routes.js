import { Router } from "express";

import requireAuth from "../middleware/auth.middleware.js";

import { uploadSingleDocument } from "../config/upload.js";

import {
  uploadDocument,
  listDocuments,
  getDocumentById,
  getDocumentFile,
  getDocumentContent,
  deleteDocument,
} from "../controllers/document.controller.js";

import {
  generateSummary,
  explainConcept,
} from "../controllers/aiActions.controller.js";

import {
  sendChatMessage,
  getChatHistory,
} from "../controllers/documentChat.controller.js";

import {
  generateFlashcardSet,
  listFlashcardSets,
  getFlashcardSet,
} from "../controllers/flashcard.controller.js";

import {
  generateQuiz,
  listQuizzes,
  getQuizById,
  submitQuiz,
  getQuizAttemptById,
} from "../controllers/quiz.controller.js";



const router = Router();

// Every document endpoint requires authentication.
router.use(requireAuth);

// Upload.
router.post("/", uploadSingleDocument, uploadDocument);
router.post("/:id/summary", generateSummary);
router.post("/:id/explain", explainConcept);

// List documents.
router.get("/", listDocuments);

// Specific sub-routes.
router.get("/:id/file", getDocumentFile);
router.get("/:id/content", getDocumentContent);

// Chat routes.
router.get("/:id/chat", getChatHistory);
router.post("/:id/chat", sendChatMessage);

// Flashcard routes.
router.post("/:id/flashcard-sets", generateFlashcardSet);

router.get("/:id/flashcard-sets", listFlashcardSets);

// Quiz routes.
router.post("/:id/quizzes", generateQuiz);
router.get("/:id/quizzes", listQuizzes);
router.get("/:id/quizzes/:quizId", getQuizById);
router.post(
  "/:id/quizzes/:quizId/attempts",
  submitQuiz
);
router.get(
  "/:id/quizzes/:quizId/attempts/:attemptId",
  getQuizAttemptById
);

router.get(
  "/:id/flashcard-sets/:setId",
  getFlashcardSet
);

// General document route.
router.get("/:id", getDocumentById);

// Delete.
router.delete("/:id", deleteDocument);

export default router;