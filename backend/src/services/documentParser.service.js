
import { readFile } from "node:fs/promises";
import { fileTypeFromBuffer } from "file-type";
import { OfficeParser } from "officeparser";

const allowedTypes = new Set(["pdf", "docx", "pptx"]);

const createError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

export const extractDocumentText = async (filePath, extension) => {
  const expectedType = extension.replace(".", "").toLowerCase();

  if (!allowedTypes.has(expectedType)) {
    throw createError(415, "Unsupported document format.");
  }

  const buffer = await readFile(filePath);

  // Validate the file's actual signature before parsing.
  if (expectedType === "pdf") {
    const detectedType = await fileTypeFromBuffer(buffer);

    if (detectedType?.ext !== "pdf") {
      throw createError(
        415,
        "The uploaded file is not a valid PDF."
      );
    }
  } else {
    // DOCX and PPTX are ZIP-based Office document formats.
    const signature = buffer.subarray(0, 4).toString("hex");

    const isZipFile = [
      "504b0304",
      "504b0506",
      "504b0708",
    ].includes(signature);

    if (!isZipFile) {
      throw createError(
        415,
        "The uploaded file is not a valid Office document."
      );
    }
  }

  try {
    const ast = await OfficeParser.parseOffice(buffer, {
      fileType: expectedType,
    });

    // Do not trust a file just because its extension is allowed.
    if (String(ast.type).toLowerCase() !== expectedType) {
      throw createError(
        415,
        "The file content does not match its extension."
      );
    }

    const result = await ast.to("text");

    if (typeof result.value !== "string") {
      throw new Error("The parser did not return text.");
    }

    return result.value
      .replace(/\u0000/g, "")
      .replace(/\r\n?/g, "\n")
      .trim();
  } catch (error) {
    if (error.statusCode) {
      throw error;
    }

    throw createError(
      422,
      "The document could not be read. Check that it is a valid, unencrypted PDF, DOCX, or PPTX file."
    );
  }
};

export const splitTextIntoChunks = (text, chunkSize = 1200) => {
  const chunks = [];
  let start = 0;

  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);

    // Prefer breaking at a whitespace boundary.
    if (end < text.length) {
      const window = text.slice(start, end);

      const boundary = Math.max(
        window.lastIndexOf("\n\n"),
        window.lastIndexOf("\n"),
        window.lastIndexOf(" ")
      );

      if (boundary > chunkSize * 0.65) {
        end = start + boundary + 1;
      }
    }

    const content = text.slice(start, end);

    if (content.trim()) {
      chunks.push({
        content,
        startChar: start,
        endChar: end,
      });
    }

    start = end;
  }

  return chunks;
};
