
import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    originalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },

    storedFileName: {
      type: String,
      required: true,
      unique: true,
    },

    fileExtension: {
      type: String,
      required: true,
      enum: [".pdf", ".docx", ".pptx"],
    },

    mimeType: {
      type: String,
      required: true,
    },

    size: {
      type: Number,
      required: true,
      min: 1,
    },

    extractedTextLength: {
      type: Number,
      default: 0,
      min: 0,
    },

    chunkCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    processingStatus: {
      type: String,
      enum: ["ready", "no_text"],
      default: "ready",
    },
    
    summary: {
      type: String,
      default: null,
    },

    summaryGeneratedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,

    toJSON: {
      transform: (_document, returnedObject) => {
        delete returnedObject.owner;
        delete returnedObject.storedFileName;
        delete returnedObject.__v;

        return returnedObject;
      },
    },
  }
);

documentSchema.index({ owner: 1, createdAt: -1 });

const Document = mongoose.model("Document", documentSchema);

export default Document;
