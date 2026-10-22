
import mongoose from "mongoose";
import { z } from "zod";

import Document from "../models/Document.js";
import DocumentChunk from "../models/DocumentChunk.js";
import FlashcardSet from "../models/FlashcardSet.js";

import {
  generateFlashcardsFromDocument,
} from "../services/flashcard.service.js";

const generateSchema = z.object({
  count: z.number().int().min(1).max(30).default(10),
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

const findOwnedDocument = async (documentId, ownerId) => {
  if (!mongoose.isValidObjectId(documentId)) {
    const error = new Error("Invalid document ID.");
    error.statusCode = 400;
    throw error;
  }

  const document = await Document.findOne({
    _id: documentId,
    owner: ownerId,
  }).select("_id originalName");

  if (!document) {
    const error = new Error("Document not found.");
    error.statusCode = 404;
    throw error;
  }

  return document;
};

// POST /api/v1/documents/:id/flashcard-sets
export const generateFlashcardSet = async (
  req,
  res,
  next
) => {
  try {
    const parsed = generateSchema.safeParse(
      req.body ?? {}
    );

    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }

    const document = await findOwnedDocument(
      req.params.id,
      req.user._id
    );

    const chunks = await DocumentChunk.find({
      document: document._id,
      owner: req.user._id,
    })
      .select("chunkIndex content")
      .sort({ chunkIndex: 1 })
      .lean();

    const generated = await generateFlashcardsFromDocument(
      chunks,
      parsed.data.count
    );

    const flashcardSet = await FlashcardSet.create({
      owner: req.user._id,
      document: document._id,
      title: generated.title,
      cards: generated.cards,
    });

    return res.status(201).json({
      success: true,
      message: "Flashcards generated successfully.",
      data: {
        flashcardSet,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/documents/:id/flashcard-sets
export const listFlashcardSets = async (
  req,
  res,
  next
) => {
  try {
    const document = await findOwnedDocument(
      req.params.id,
      req.user._id
    );

    const sets = await FlashcardSet.find({
      document: document._id,
      owner: req.user._id,
    })
      .select("title cards createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        flashcardSets: sets.map((set) => ({
          ...set,
          cardCount: set.cards.length,
          cards: undefined,
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/documents/:id/flashcard-sets/:setId
export const getFlashcardSet = async (
  req,
  res,
  next
) => {
  try {
    const document = await findOwnedDocument(
      req.params.id,
      req.user._id
    );

    if (!mongoose.isValidObjectId(req.params.setId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid flashcard set ID.",
      });
    }

    const flashcardSet = await FlashcardSet.findOne({
      _id: req.params.setId,
      document: document._id,
      owner: req.user._id,
    });

    if (!flashcardSet) {
      return res.status(404).json({
        success: false,
        message: "Flashcard set not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        flashcardSet,
      },
    });
  } catch (error) {
    return next(error);
  }
};
