
import mongoose from "mongoose";

const documentChunkSchema = new mongoose.Schema(
  {
    document: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    chunkIndex: {
      type: Number,
      required: true,
      min: 0,
    },

    startChar: {
      type: Number,
      required: true,
      min: 0,
    },

    endChar: {
      type: Number,
      required: true,
      min: 0,
    },

    content: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

documentChunkSchema.index(
  { document: 1, chunkIndex: 1 },
  { unique: true }
);

documentChunkSchema.index({ owner: 1, document: 1 });

const DocumentChunk = mongoose.model(
  "DocumentChunk",
  documentChunkSchema
);

export default DocumentChunk;
