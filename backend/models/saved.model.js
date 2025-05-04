const mongoose = require("mongoose");
const client = require("../config");

const SavedSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Saved = client.model("Saved", SavedSchema);
module.exports = Saved;
