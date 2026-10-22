
import { GoogleGenAI } from "@google/genai";

let client;

export const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const error = new Error(
      "Gemini API is not configured. Set GEMINI_API_KEY in .env."
    );

    error.statusCode = 503;
    throw error;
  }

  // Initialize only when the first AI request arrives.
  if (!client) {
    client = new GoogleGenAI({ apiKey });
  }

  return client;
};

export const getGeminiModel = () => {
  return process.env.GEMINI_MODEL || "gemini-3.8-flash";
};
