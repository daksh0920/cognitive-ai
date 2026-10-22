
import bcrypt from "bcrypt";
import { z } from "zod";

import User from "../models/User.js";
import createAuthToken from "../utils/createAuthToken.js";

const passwordSchema = z
  .string()
  .min(8, "Password must contain at least 8 characters.")
  .refine(
    (password) => Buffer.byteLength(password, "utf8") <= 72,
    "Password must not exceed 72 bytes."
  );

const signupSchema = z.object({
  username: z
    .string()
    .trim()
    .min(2, "Username must contain at least 2 characters.")
    .max(40, "Username must not exceed 40 characters."),

  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(254, "Email is too long.")
    .transform((email) => email.toLowerCase()),

  password: passwordSchema,
});

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address.")
    .max(254, "Email is too long.")
    .transform((email) => email.toLowerCase()),

  password: z
    .string()
    .min(1, "Password is required.")
    .refine(
      (password) => Buffer.byteLength(password, "utf8") <= 72,
      "Password must not exceed 72 bytes."
    ),
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

// POST /api/v1/auth/signup
export const signup = async (req, res, next) => {
  try {
    const parsed = signupSchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }

    const { username, email, password } = parsed.data;

    // Provide a friendly response for an existing email.
    const existingUser = await User.findOne({ email }).select("_id");

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // Never store the original password.
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    const token = createAuthToken(user._id);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (error) {
    // Handles duplicate-email races at the database level.
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    return next(error);
  }
};

// POST /api/v1/auth/login
export const login = async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body ?? {});

    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }

    const { email, password } = parsed.data;

    // Password is excluded by default in the User model.
    // Explicitly select it because bcrypt needs to verify it.
    const user = await User.findOne({ email }).select("+password");

    // Use the same message for unknown email and wrong password.
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    const token = createAuthToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (error) {
    return next(error);
  }
};

// GET /api/v1/auth/me
export const getMe = (req, res) => {
  return res.status(200).json({
    success: true,
    message: "User retrieved successfully.",
    data: {
      user: req.user.toJSON(),
    },
  });
};
