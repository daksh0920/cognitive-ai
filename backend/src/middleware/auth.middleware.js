
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const requireAuth = async (req, res, next) => {
  const authorization = req.get("Authorization");

  if (!authorization) {
    return res.status(401).json({
      success: false,
      message: "Authentication required. Please log in.",
    });
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "Invalid authorization header.",
    });
  }

  let payload;

  // Verify the token before trusting its contents.
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    const message =
      error.name === "TokenExpiredError"
        ? "Your session has expired. Please log in again."
        : "Invalid authentication token.";

    return res.status(401).json({
      success: false,
      message,
    });
  }

  if (typeof payload === "string" || !payload.sub) {
    return res.status(401).json({
      success: false,
      message: "Invalid authentication token.",
    });
  }

  try {
    // Find the account represented by the verified token.
    const user = await User.findById(payload.sub).select(
      "_id username email createdAt updatedAt"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "This account no longer exists.",
      });
    }

    // Make the authenticated user available to later handlers.
    req.user = user;

    return next();
  } catch (error) {
    return next(error);
  }
};

export default requireAuth;
