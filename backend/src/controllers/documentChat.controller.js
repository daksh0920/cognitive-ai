
import mongoose from "mongoose";
import { z } from "zod";

import Document from "../models/Document.js";
import ChatMessage from "../models/ChatMessage.js";

import {
  answerDocumentQuestion,
} from "../services/documentChat.service.js";

const chatRequestSchema = z.object({
  message: z.string().trim().min(1).max(3000),
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

// POST /api/v1/documents/:id/chat
export const sendChatMessage = async (req, res, next) => {
  try {
    const parsed = chatRequestSchema.safeParse(
      req.body ?? {}
    );

    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }

    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID.",
      });
    }

    const document = await Document.findOne({
      _id: req.params.id,
      owner: req.user._id,
    }).select("_id originalName");

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    // Retrieve earlier messages before saving the new question.
    const previousMessages = await ChatMessage.find({
      document: document._id,
      owner: req.user._id,
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("role content")
      .lean();

    previousMessages.reverse();

    const userMessage = await ChatMessage.create({
      document: document._id,
      owner: req.user._id,
      role: "user",
      content: parsed.data.message,
    });

    const result = await answerDocumentQuestion({
      documentId: document._id,
      ownerId: req.user._id,
      question: parsed.data.message,
      history: previousMessages,
    });

    const assistantMessage = await ChatMessage.create({
      document: document._id,
      owner: req.user._id,
      role: "assistant",
      content: result.answer,
      sourceChunks: result.sourceChunks,
    });

    return res.status(200).json({
      success: true,
      message: "Chat response generated successfully.",
      data: {
        documentId: document._id,
        userMessage: {
          id: userMessage._id,
          role: userMessage.role,
          content: userMessage.content,
          createdAt: userMessage.createdAt,
        },
        assistantMessage: {
          id: assistantMessage._id,
          role: assistantMessage.role,
          content: assistantMessage.content,
          sourceChunks: assistantMessage.sourceChunks,
          createdAt: assistantMessage.createdAt,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/documents/:id/chat
export const getChatHistory = async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID.",
      });
    }

    const document = await Document.findOne({
      _id: req.params.id,
      owner: req.user._id,
    }).select("_id");

    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found.",
      });
    }

    const requestedLimit =
      Number.parseInt(req.query.limit, 10) || 50;

    const limit = Math.min(
      Math.max(requestedLimit, 1),
      100
    );

    const filter = {
      document: document._id,
      owner: req.user._id,
    };

    const [messages, totalMessages] = await Promise.all([
      ChatMessage.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("role content sourceChunks createdAt")
        .lean(),

      ChatMessage.countDocuments(filter),
    ]);

    messages.reverse();

    return res.status(200).json({
      success: true,
      data: {
        messages,
        pagination: {
          limit,
          totalMessages,
          hasMore: totalMessages > messages.length,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};
