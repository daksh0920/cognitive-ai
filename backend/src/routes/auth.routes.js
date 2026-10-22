
import { Router } from "express";

import {
  signup,
  login,
  getMe,
} from "../controllers/auth.controller.js";

import requireAuth from "../middleware/auth.middleware.js";

const router = Router();

router.post("/signup", signup);
router.post("/login", login);

// This endpoint requires a valid JWT.
router.get("/me", requireAuth, getMe);

export default router;
