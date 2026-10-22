
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import documentRoutes from "./routes/document.routes.js";

const app = express();

// Reduce unnecessary information in HTTP responses.
app.disable("x-powered-by");

// Security-related HTTP headers.
app.use(helmet());

// Allow requests from the React frontend.
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
  })
);

// Parse incoming JSON request bodies.
app.use(express.json({ limit: "1mb" }));

// Parse URL-encoded form bodies.
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// Log requests during development.
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// API routes.
app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/documents", documentRoutes);

// Unknown routes.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Central error handler.
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal server error.";

  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      statusCode = 413;
      message = "File too large. Maximum upload size is 20 MB.";
    } else {
      statusCode = 400;
      message = "Invalid file upload.";
    }
  }

  // Hide internal errors in production, but retain client-error messages.
  if (
    process.env.NODE_ENV === "production" &&
    statusCode >= 500
  ) {
    message = "Internal server error.";
  }

  console.error(err);

  return res.status(statusCode).json({
    success: false,
    message,
  });
});

export default app;
