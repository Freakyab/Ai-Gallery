const mongoose = require("mongoose");
const client = require("../config");

const CommentsSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    comment: {
      type: String,
      required: true,
    },
    postId: {
      type: String,
      required: true,
    },
    likes: {
      type: Number,
      default: 0,
    },
    liked: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Comments = client.model("Comments", CommentsSchema);
module.exports = Comments;
