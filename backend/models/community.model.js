const mongoose = require("mongoose");
const client = require("../config");

const CommunitySchema = new mongoose.Schema(
  {
   title : {
    type: String,
    required: true,
   },
    description: {
     type: String,
     required: true,
    },
    image : {
     type: String,
     default: "https",
     required: true,
    },
    members : {
     type: Number,
     default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Community = client.model("Community", CommunitySchema);
module.exports = Community;
