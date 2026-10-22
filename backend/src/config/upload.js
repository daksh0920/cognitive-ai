
import multer from "multer";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";

export const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

mkdirSync(UPLOAD_DIR, { recursive: true });

const allowedExtensions = new Set([".pdf", ".docx", ".pptx"]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, UPLOAD_DIR);
  },

  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();

    // Never use the user's original filename as the disk filename.
    callback(null, `${randomUUID()}${extension}`);
  },
});

const fileFilter = (_req, file, callback) => {
  const extension = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.has(extension)) {
    const error = new Error(
      "Only PDF, DOCX, and PPTX files are supported."
    );

    error.statusCode = 415;
    return callback(error);
  }

  callback(null, true);
};

const upload = multer({
  storage,
  fileFilter,

  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB per file
    files: 1,
    fields: 0,
    parts: 1,
  },
});

// The expected multipart field name is "document".
export const uploadSingleDocument = upload.single("document");
