
import mongoose from "mongoose";
import { z } from "zod";

import Document from "../models/Document.js";
import DocumentChunk from "../models/DocumentChunk.js";

import {
  generateDocumentSummary,
  explainDocumentConcept,
} from "../services/aiActions.service.js";

const summaryRequestSchema = z.object({
  refresh: z.boolean().optional(),
});

const explainRequestSchema = z.object({
  topic: z.string().trim().min(2).max(160),
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

const loadOwnedDocument = async (documentId, userId) => {
  if (!mongoose.isValidObjectId(documentId)) {
    const error = new Error("Invalid document ID.");
    error.statusCode = 400;
    throw error;
  }

  const document = await Document.findOne({
    _id: documentId,
    owner: userId,
  });

  if (!document) {
    const error = new Error("Document not found.");
    error.statusCode = 404;
    throw error;
  }

  return document;
};

const loadOwnedChunks = (documentId, userId) => {
  return DocumentChunk.find({
    document: documentId,
    owner: userId,
  })
    .select("chunkIndex content")
    .sort({ chunkIndex: 1 })
    .lean();
};

// POST /api/v1/documents/:id/summary
export const generateSummary = async (
  req,
  res,
  next
) => {
  try {
    const parsed = summaryRequestSchema.safeParse(
      req.body ?? {}
    );

    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }

    const document = await loadOwnedDocument(
      req.params.id,
      req.user._id
    );

    const { refresh = false } = parsed.data;

    // Reuse the saved summary unless refresh is requested.
    if (document.summary && !refresh) {
      return res.status(200).json({
        success: true,
        message: "Retrieved the saved summary.",
        data: {
          documentId: document._id,
          summary: document.summary,
          generatedAt: document.summaryGeneratedAt,
          cached: true,
        },
      });
    }

    const chunks = await loadOwnedChunks(
      document._id,
      req.user._id
    );

    const summary = await generateDocumentSummary(chunks);

    document.summary = summary;
    document.summaryGeneratedAt = new Date();

    await document.save();

    return res.status(200).json({
      success: true,
      message: "Summary generated successfully.",
      data: {
        documentId: document._id,
        summary: document.summary,
        generatedAt: document.summaryGeneratedAt,
        cached: false,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// POST /api/v1/documents/:id/explain
export const explainConcept = async (
  req,
  res,
  next
) => {
  try {
    const parsed = explainRequestSchema.safeParse(
      req.body ?? {}
    );

    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }

    const document = await loadOwnedDocument(
      req.params.id,
      req.user._id
    );

    const chunks = await loadOwnedChunks(
      document._id,
      req.user._id
    );

    const { explanation, sourceChunks } =
      await explainDocumentConcept(
        chunks,
        parsed.data.topic
      );

    return res.status(200).json({
      success: true,
      message: "Concept explanation completed.",
      data: {
        documentId: document._id,
        topic: parsed.data.topic,
        explanation,
        sourceChunks,
      },
    });
  } catch (error) {
    return next(error);
  }
};
