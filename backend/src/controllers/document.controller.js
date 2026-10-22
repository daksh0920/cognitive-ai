import path from "node:path";
import { unlink } from "node:fs/promises";
import mongoose from "mongoose";

import { UPLOAD_DIR } from "../config/upload.js";

import Document from "../models/Document.js";
import DocumentChunk from "../models/DocumentChunk.js";
import ChatMessage from "../models/ChatMessage.js";
import FlashcardSet from "../models/FlashcardSet.js";

import {
  extractDocumentText,
  splitTextIntoChunks,
} from "../services/documentParser.service.js";

const MAX_EXTRACTED_TEXT_CHARS = 2_000_000;

const MIME_TYPES = {
  ".pdf": "application/pdf",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const removeFile = async (filePath) => {
  try {
    await unlink(filePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error(
        "Could not remove uploaded file:",
        error.message
      );
    }
  }
};

// POST /api/v1/documents
export const uploadDocument = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Please upload a file using the "document" field.',
    });
  }

  const uploadedFile = req.file;
  const extension = path
    .extname(uploadedFile.originalname)
    .toLowerCase();

  let extractedText;

  // Step 1: Validate the content and extract text.
  try {
    extractedText = await extractDocumentText(
      uploadedFile.path,
      extension
    );
  } catch (error) {
    await removeFile(uploadedFile.path);
    return next(error);
  }

  // Prevent unexpectedly large extracted documents.
  if (extractedText.length > MAX_EXTRACTED_TEXT_CHARS) {
    await removeFile(uploadedFile.path);

    const error = new Error(
      "The extracted document text exceeds the current 2,000,000-character limit."
    );

    error.statusCode = 413;
    return next(error);
  }

  const chunks = splitTextIntoChunks(extractedText);

  let savedDocument;

  try {
    // Step 2: Save document metadata.
    savedDocument = await Document.create({
      owner: req.user._id,

      originalName: path
        .basename(uploadedFile.originalname)
        .replace(/[\r\n\0]/g, "")
        .slice(0, 255),

      storedFileName: uploadedFile.filename,
      fileExtension: extension,
      mimeType: MIME_TYPES[extension],
      size: uploadedFile.size,

      extractedTextLength: extractedText.length,
      chunkCount: chunks.length,

      processingStatus:
        chunks.length > 0 ? "ready" : "no_text",
    });

    // Step 3: Save extracted text in ordered chunks.
    if (chunks.length > 0) {
      const chunkDocuments = chunks.map((chunk, index) => ({
        document: savedDocument._id,
        owner: req.user._id,
        chunkIndex: index,
        startChar: chunk.startChar,
        endChar: chunk.endChar,
        content: chunk.content,
      }));

      await DocumentChunk.insertMany(chunkDocuments);
    }

    return res.status(201).json({
      success: true,
      message:
        chunks.length > 0
          ? "Document uploaded and processed successfully."
          : "Document uploaded, but no selectable text was found.",
      data: {
        document: savedDocument.toJSON(),
      },
    });
  } catch (error) {
    // Roll back database records if upload persistence fails.
    if (savedDocument) {
      await Promise.allSettled([
        DocumentChunk.deleteMany({
          document: savedDocument._id,
          owner: req.user._id,
        }),

        Document.deleteOne({
          _id: savedDocument._id,
          owner: req.user._id,
        }),
      ]);
    }

    await removeFile(uploadedFile.path);
    return next(error);
  }
};

// GET /api/v1/documents
export const listDocuments = async (req, res, next) => {
  try {
    const parsePositiveInt = (
      value,
      fallback,
      maximum
    ) => {
      const number = Number(value);

      if (
        !Number.isSafeInteger(number) ||
        number < 1
      ) {
        return fallback;
      }

      return Math.min(number, maximum);
    };

    const page = parsePositiveInt(
      req.query.page,
      1,
      1000000
    );

    const limit = parsePositiveInt(
      req.query.limit,
      20,
      100
    );

    const skip = (page - 1) * limit;

    // Return only documents owned by the authenticated user.
    const filter = {
      owner: req.user._id,
    };

    const [documents, totalDocuments] = await Promise.all([
      Document.find(filter)
        .select(
          "originalName fileExtension mimeType size extractedTextLength chunkCount processingStatus createdAt updatedAt"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      Document.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        documents,
        pagination: {
          page,
          limit,
          totalDocuments,
          totalPages: Math.ceil(totalDocuments / limit),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/documents/:id
export const getDocumentById = async (
  req,
  res,
  next
) => {
  try {
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

    return res.status(200).json({
      success: true,
      data: {
        document: document.toJSON(),
      },
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/documents/:id/file
export const getDocumentFile = async (
  req,
  res,
  next
) => {
  try {
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

    // Use the server-generated filename, not user input.
    const safeFileName = path.basename(
      document.storedFileName
    );

    const encodedName = encodeURIComponent(
      document.originalName
    );

    // PDFs can be displayed inline; Office files are downloaded.
    const disposition =
      document.fileExtension === ".pdf"
        ? "inline"
        : "attachment";

    res.setHeader("Content-Type", document.mimeType);

    res.setHeader(
      "Content-Disposition",
      `${disposition}; filename*=UTF-8''${encodedName}`
    );

    res.setHeader(
      "X-Content-Type-Options",
      "nosniff"
    );

    return res.sendFile(
      safeFileName,
      { root: UPLOAD_DIR },
      (error) => {
        if (error) {
          next(error);
        }
      }
    );
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/documents/:id/content
export const getDocumentContent = async (
  req,
  res,
  next
) => {
  try {
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

    const page = Math.max(
      1,
      Math.min(
        Number.parseInt(req.query.page, 10) || 1,
        1000000
      )
    );

    const requestedLimit =
      Number.parseInt(req.query.limit, 10) || 20;

    const limit = Math.min(
      Math.max(requestedLimit, 1),
      100
    );

    const skip = (page - 1) * limit;

    const filter = {
      document: document._id,
      owner: req.user._id,
    };

    const [chunks, totalChunks] = await Promise.all([
      DocumentChunk.find(filter)
        .sort({ chunkIndex: 1 })
        .skip(skip)
        .limit(limit)
        .select("chunkIndex content startChar endChar -_id")
        .lean(),

      DocumentChunk.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        documentId: document._id,
        originalName: document.originalName,
        content: chunks
          .map((chunk) => chunk.content)
          .join(""),
        pagination: {
          page,
          limit,
          totalChunks,
          totalPages: Math.ceil(totalChunks / limit),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

// DELETE /api/v1/documents/:id
export const deleteDocument = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid document ID.",
      });
    }

    // Verify that this document belongs to the current user.
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

    // Remove all learning materials associated with this document.
    await Promise.all([
      DocumentChunk.deleteMany({
        document: document._id,
        owner: req.user._id,
      }),

      ChatMessage.deleteMany({
        document: document._id,
        owner: req.user._id,
      }),

      FlashcardSet.deleteMany({
        document: document._id,
        owner: req.user._id,
      }),
    ]);

    // Remove document metadata after its related records.
    await Document.deleteOne({
      _id: document._id,
      owner: req.user._id,
    });

    // Remove the original file from local storage.
    const filePath = path.join(
      UPLOAD_DIR,
      path.basename(document.storedFileName)
    );

    await removeFile(filePath);

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully.",
      data: {
        documentId: document._id,
      },
    });
  } catch (error) {
    return next(error);
  }
};