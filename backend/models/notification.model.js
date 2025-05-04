const mongoose = require("mongoose");
const client = require("../config");

const NotificationSchema = new mongoose.Schema(
  {
    desc: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isCommunity: {
      type: Boolean,
      default: false,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
    commentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
    community: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Community",
    },
  },
  {
    timestamps: true,
  }
);

const Notification = client.model("Notification", NotificationSchema);
module.exports = Notification;
