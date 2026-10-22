
import { Router } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    // Check that MongoDB can actually respond to a ping.
    await mongoose.connection.db.admin().ping();

    return res.status(200).json({
      success: true,
      message: "API and database are healthy.",
      data: {
        api: "up",
        database: "connected",
      },
      timestamp: new Date().toISOString(),
    });
  } catch {
    return res.status(503).json({
      success: false,
      message: "The database is unavailable.",
      data: {
        api: "up",
        database: "disconnected",
      },
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
