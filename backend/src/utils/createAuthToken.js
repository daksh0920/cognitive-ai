
import jwt from "jsonwebtoken";

const createAuthToken = (userId) => {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret === "your_long_random_secret") {
    throw new Error(
      "Configure a strong JWT_SECRET in your .env file."
    );
  }

  return jwt.sign(
    { sub: userId.toString() },
    secret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "1d",
    }
  );
};

export default createAuthToken;
