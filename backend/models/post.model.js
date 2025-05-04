const mongoose = require("mongoose");
const client = require("../config");

const PostSchema = new mongoose.Schema(
  {
    name : {
      type: String,
      required: true,
      unique: false ,
    },
    post: {
      type: String,
      required: true,
    },
    image : {
      type: String,
      required: false,
    },
    like : {
      type: Number,
      default: 0,
    },
    liked : {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Account",
      required: false,
    },
    comment : {
      type: Number,
      default: 0,
    },
    communityId: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Community",
      required: false,
    },
    share : {
      type: Number,
      default: 0,
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

const Post = client.model("Post", PostSchema);
module.exports = Post;
