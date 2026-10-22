
import {
  getGeminiClient,
  getGeminiModel,
} from "../config/gemini.js";

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const getProviderStatus = (error) =>
  Number(
    error.status ??
    error.statusCode ??
    error.response?.status
  );

export const generateGeminiText = async ({
  systemInstruction,
  prompt,
  maxOutputTokens = 1200,
}) => {
  const client = getGeminiClient();
  const model = getGeminiModel();

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction,
          maxOutputTokens,
        },
      });

      const generatedText = response.text?.trim();

      if (!generatedText) {
        const error = new Error(
          "Gemini returned an empty response."
        );

        error.statusCode = 502;
        throw error;
      }

      return generatedText;
    } catch (error) {
      const status = getProviderStatus(error);

      console.error("Gemini request failed:", {
        attempt,
        status: status || "unknown",
        message: error.message,
      });

      const retryable =
        status === 408 ||
        status === 429 ||
        (status >= 500 && status <= 599);

      // Retry only transient failures.
      if (retryable && attempt < maxAttempts) {
        const baseDelay = 1000 * 2 ** (attempt - 1);
        const jitter = Math.floor(Math.random() * 500);
        const delay = baseDelay + jitter;

        console.log(
          `Retrying Gemini in ${delay}ms ` +
          `(attempt ${attempt + 1}/${maxAttempts})...`
        );

        await sleep(delay);
        continue;
      }

      const safeError = new Error(
        status === 503
          ? "Gemini is temporarily overloaded. Please try again shortly."
          : status === 429
            ? "Gemini rate limit or quota reached. Please try again later."
            : status === 408
              ? "The Gemini request timed out. Please try again."
              : "The AI service could not generate a response."
      );

      // Preserve the provider's meaningful status.
      safeError.statusCode =
        status === 503 ? 503 :
        status === 429 ? 429 :
        502;

      throw safeError;
    }
  }
};
