
import mongoose from "mongoose";

const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    throw new Error("MONGODB_URI is missing from the .env file.");
  }

  await mongoose.connect(mongoUri, {
    dbName: "ai_learning_assistant",
  });

  console.log("MongoDB Atlas connected successfully.");
};

export default connectDB;
