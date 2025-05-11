const express = require("express");
const cors = require("cors");

const app = express();
const Account = require("./models/account.model");
const Post = require("./models/post.model");
const Comments = require("./models/comments.model");
const Community = require("./models/community.model");
const Notification = require("./models/notification.model");
const Saved = require("./models/saved.model");
const jwt = require("jsonwebtoken");
const { GoogleGenAI, Modality } = require("@google/genai");
const { cloudinary } = require("./cloundinary");
const auth = require("./middleware");

const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

app.get("/", async (_, res) => {
  try {
    return res.status(200).json({
      message: "Welcome to the Ai Gallery API",
      status: true,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { name, email, password, picture } = req.body;

    const existingAccount = await Account.findOne({ email });

    const token = jwt.sign(
      { id: existingAccount._id },
      process.env.JWT_SECRET,
      {}
    );
    if (existingAccount) {
      return res.status(201).json({
        message: "User found",
        status: true,
        user: {
          ...existingAccount._doc,
          token,
        },
      });
    }

    const newAccount = new Account({
      name,
      email,
      password,
      picture,
    });

    const notification = new Notification({
      desc: "Welcome to the our platform!",
      name: newAccount.name,
      to: newAccount._id,
    });

    await notification.save();

    await newAccount.save();

    const newToken = jwt.sign(
      { id: newAccount._id },
      process.env.JWT_SECRET,
      {}
    );

    return res.status(201).json({
      message: "User created successfully",
      status: true,
      user: { ...newAccount._doc, token: newToken },
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

app.post("/upload", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const { username, avatar, post, image, communityId } = req.body;
    if (!username || !avatar || !post) {
      return res.status(400).json({
        message: "All fields are required",
        status: false,
      });
    }

    const newPost = new Post({
      name: username,
      avatar,
      post,
      image,
      userId,
      communityId,
    });

    await newPost.save();

    return res.status(201).json({
      message: "Post created successfully",
      status: true,
      post: newPost,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

app.post("/check-url", auth, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({
        message: "URL is required",
        status: false,
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

    // Fetch and convert image to base64
    const imageResponse = await fetch(url);
    const base64Image = Buffer.from(await imageResponse.arrayBuffer()).toString(
      "base64"
    );

    // Generate AI comments
    const aiResult = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image,
          },
        },
        {
          text: 'check if this image is ai generated or not. Respond only with valid JSON in the format: { "isAiGenerated": true/false }',
        },
      ],
    });

    // Parse AI response
    const content = JSON.parse(
      aiResult.text.replace(/```(?:json)?\s*([\s\S]*?)\s*```/, "$1").trim()
    );

    if (content.isAiGenerated) {
      return res.status(200).json({
        message: "Image is AI generated",
        status: true,
      });
    }

    // delete the image from cloudinary
    const parts = url.split("/");
    const fileName = parts.pop();
    const publicId = fileName.split(".")[0];
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result !== "ok") {
      return res.status(500).json({
        message: "Internal server error",
        status: false,
      });
    }

    return res.status(200).json({
      message: "Image is not AI generated",
      status: false,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

app.post("/update-post/:id", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { post } = req.body;
    if (!post) {
      return res.status(400).json({
        message: "All fields are required",
        status: false,
      });
    }

    const existingPost = await Post.findById(id);

    if (!existingPost) {
      return res.status(404).json({
        message: "Post not found",
        status: false,
      });
    }

    if (existingPost.userId.toString() !== userId) {
      return res.status(403).json({
        message: "You are not authorized to update this post",
        status: false,
      });
    }

    const updatedPost = await Post.findByIdAndUpdate(
      id,
      {
        post,
      },
      { new: true }
    );

    return res.status(200).json({
      message: "Post updated successfully",
      status: true,
      post: updatedPost,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

app.get("/posts/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const posts = await Post.find().sort({ createdAt: -1 });

    //find all docs where postId is in the array of posts
    const savedPost = await Saved.find({
      postId: { $in: posts.map((post) => post._id) },
    });

    const postsWithUserDetails = await Promise.all(
      posts.map(async (post) => {
        const user = await Account.findById(post.userId);
        return {
          ...post._doc,
          avatar: user.picture,
          username: user.name,
          isSaved: userId
            ? savedPost.some(
                (saved) =>
                  saved.postId.toString() === post._id.toString() &&
                  saved.userId.toString() === userId
              )
            : false,
          isLiked: userId && post.liked.includes(userId) ? true : false,
          isEditable: userId && post.userId.toString() === userId,
        };
      })
    );

    return res.status(200).json({
      message: "Posts fetched successfully",
      status: true,
      posts: postsWithUserDetails,
      savedPost: savedPost,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

//id is a postId
app.get("/comments/:id/:userId", async (req, res) => {
  try {
    const { id, userId } = req.params;
    const post = await Post.findById(id);
    let savedPost = null;

    if (userId !== "undefined") {
      savedPost = await Saved.findOne({
        postId: id,
        userId,
      });
    }

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
        status: false,
      });
    }

    let comments = await Comments.find({ postId: id }).sort({ createdAt: -1 });
    const user = await Account.findById(post.userId);

    // If no comments exist, generate AI comments
    if (comments.length === 0) {
      const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

      // Fetch and convert image to base64
      const imageResponse = await fetch(post.image);
      const base64Image = Buffer.from(
        await imageResponse.arrayBuffer()
      ).toString("base64");

      // Generate AI comments
      const aiResult = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          {
            text: `Create 20-30 comments for this image.
            make sure the comments are relevant to the image and lengthy.
            add some emojis to the comments also several tones in comment like positive, negative, neutral.
            Respond only with valid JSON in the format: { "comments": ["comment1", "comment2", ...] }`,
          },
        ],
      });

      // Parse AI response
      const content = JSON.parse(
        aiResult.text.replace(/```(?:json)?\s*([\s\S]*?)\s*```/, "$1").trim()
      );

      // Create dummy comments
      const dummyAccounts = await Account.find({ type: "dummy" });
      const randomAccounts = dummyAccounts
        .sort(() => 0.5 - Math.random())
        .slice(0, 20);

      const commentsToSave = content.comments.map((comment, index) => ({
        userId: randomAccounts[index % randomAccounts.length]._id,
        comment,
        createdAt: new Date(),
        postId: id,
      }));

      comments = await Comments.insertMany(commentsToSave);

      // Update post metrics
      post.comment = comments.length;
      post.like = Math.floor(Math.random() * 25) + 5;
      await post.save();

      const notification = new Notification({
        desc: "New comments generated by AI",
        name: user.name,
        to: user._id,
      });

      await notification.save();
    }

    // Prepare response data
    const [commentUsers, postWithDetails] = await Promise.all([
      Account.find({ _id: { $in: comments.map((c) => c.userId) } }),
      {
        ...post.toObject(),
        avatar: user.picture,
        username: user.name,
        isSaved: savedPost ? true : false,
        isLiked: userId && post.liked.includes(userId) ? true : false,
        isEditable: userId && post.userId.toString() === userId,
      },
    ]);

    // Create a map for quick user lookup
    const userMap = new Map(commentUsers.map((u) => [u._id.toString(), u]));

    const commentsWithDetails = comments.map((comment) => ({
      ...comment._doc,
      avatar: userMap.get(comment.userId.toString()).picture,
      username: userMap.get(comment.userId.toString()).name,
      isLiked: comment.liked.includes(userId),
      isEditable: comment.userId.toString() === userId,
    }));

    return res.status(200).json({
      message: "Post fetched successfully",
      status: true,
      comments: commentsWithDetails,
      post: postWithDetails,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

app.post("/comment/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    const userId = req.userId;

    if (!comment) {
      return res.status(400).json({
        message: "All fields are required",
        status: false,
      });
    }

    const user = await Account.findById(userId);
    const post = await Post.findById(id);

    const newComment = new Comments({
      userId,
      comment,
      postId: id,
    });

    await newComment.save();

    if (userId !== post.userId.toString()) {
      const notification = new Notification({
        desc: `New comments on your post by ${user.name}`,
        name: user.name,
        to: userId,
        commentId: newComment._id,
      });

      await notification.save();
    }

    post.comment = post.comment + 1;
    await post.save();

    return res.status(201).json({
      message: "Comment created successfully",
      status: true,
      comment: newComment,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

app.get("/community", async (req, res) => {
  try {
    const communities = await Community.find().sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Communities fetched successfully",
      status: true,
      communities,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

app.get("/community/:id/:userId", async (req, res) => {
  try {
    const { id, userId } = req.params;
    const community = await Community.findById(id);
    let isMember = false;

    if (userId !== "undefined") {
      const viewingUser = await Account.findById(userId);
      isMember = viewingUser?.communityId.includes(id) || false;
    }

    const updatedCommunity = {
      ...community._doc,
      isMember: isMember,
    };

    const posts = await Post.find({ communityId: id }).sort({ createdAt: -1 });

    let savedPost = [];
    if (userId !== "undefined") {
      savedPost = await Saved.find({
        postId: { $in: posts.map((post) => post._id) },
        userId,
      });
    }

    const postsWithUserDetails = await Promise.all(
      posts.map(async (post) => {
        const user = await Account.findById(post.userId);
        return {
          ...post._doc,
          avatar: user.picture,
          username: user.name,
          isLiked: userId !== "undefined" ? post.liked.includes(userId) : false,
          isSaved:
            userId !== "undefined"
              ? savedPost.some(
                  (saved) =>
                    saved.postId.toString() === post._id.toString() &&
                    saved.userId.toString() === userId
                )
              : false,
          isEditable:
            userId !== "undefined" ? post.userId.toString() === userId : false,
        };
      })
    );

    if (!community) {
      return res.status(404).json({
        message: "Community not found",
        status: false,
      });
    }

    return res.status(200).json({
      message: "Community fetched successfully",
      status: true,
      community: updatedCommunity,
      posts: postsWithUserDetails,
      savedPost: savedPost,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

app.post("/join-community/:id/", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const community = await Community.findById(id);
    const user = await Account.findById(userId);

    const posts = await Post.find({ communityId: id }).sort({ createdAt: -1 });
    const postsWithUserDetails = await Promise.all(
      posts.map(async (post) => {
        const user = await Account.findById(post.userId);
        return {
          ...post._doc,
          avatar: user.picture,
          username: user.name,
        };
      })
    );

    if (!community || !user) {
      return res.status(404).json({
        message: "Community or User not found",
        status: false,
      });
    }

    community.members += 1;
    user.communityId.push(id);

    await community.save();
    await user.save();

    const notification = new Notification({
      desc: `Welcome to the ${community.title} community!`,
      name: community.title,
      isCommunity: true,
      community: community._id,
      to: userId,
    });
    await notification.save();

    const updatedCommunity = {
      ...community._doc,
      isMember: true,
    };

    return res.status(200).json({
      message: "User joined the community successfully",
      status: true,
      community: updatedCommunity,
      posts: postsWithUserDetails,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

app.post("/leave-community/:id/", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const community = await Community.findById(id);
    const user = await Account.findById(userId);

    if (!community || !user) {
      return res.status(404).json({
        message: "Community or User not found",
        status: false,
      });
    }

    community.members -= 1;
    user.communityId = user.communityId.filter(
      (communityId) => communityId.toString() !== id
    );

    await community.save();
    await user.save();

    const posts = await Post.find({ communityId: id }).sort({ createdAt: -1 });
    const postsWithUserDetails = await Promise.all(
      posts.map(async (post) => {
        const user = await Account.findById(post.userId);
        return {
          ...post._doc,
          avatar: user.picture,
          username: user.name,
        };
      })
    );

    const updatedCommunity = {
      ...community._doc,
      isMember: false,
    };

    return res.status(200).json({
      message: "User left the community successfully",
      status: true,
      community: updatedCommunity,
      posts: postsWithUserDetails,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

app.get("/user-profile", auth, async (req, res) => {
  try {
    const id = req.userId;
    const user = await Account.findById(id);
    const posts = await Post.find({ userId: id }).sort({ createdAt: -1 });
    const savedPost = await Saved.find({
      postId: { $in: posts.map((post) => post._id) },
      userId: id,
    });
    const postsWithUserDetails = await Promise.all(
      posts.map(async (post) => {
        return {
          ...post._doc,
          avatar: user.picture,
          username: user.name,
          isLiked: post.liked.includes(id) ? true : false,
          isSaved: savedPost.some(
            (saved) => saved.postId.toString() === post._id.toString()
          )
            ? true
            : false,
          isEditable: post.userId.toString() === id ? true : false,
        };
      })
    );
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: false,
      });
    }

    return res.status(200).json({
      message: "User fetched successfully",
      status: true,
      user: user,
      posts: postsWithUserDetails,
      savedPost: savedPost,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

app.delete("/delete-post/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
        status: false,
      });
    }
    if (post.image) {
      const imageUrl = post.image;
      const parts = imageUrl.split("/");
      const fileName = parts.pop();
      const publicId = fileName.split(".")[0];

      const result = await cloudinary.uploader.destroy(publicId);
      if (result.result !== "ok") {
        return res.status(500).json({
          message: "Failed to delete image from Cloudinary",
          status: false,
        });
      }
    }

    await Post.findByIdAndDelete(id);
    await Comments.deleteMany({ postId: id });

    return res.status(200).json({
      message: "Post deleted successfully",
      status: true,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

app.post("/like/:id/", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
        status: false,
      });
    }

    if (post.liked.includes(userId)) {
      post.liked = post.liked.filter((user) => user.toString() !== userId);
      post.like -= 1;
    } else {
      const user = await Account.findById(userId);
      if (userId !== post.userId.toString()) {
        const notification = new Notification({
          desc: `${user.name} liked your post`,
          name: user.name,
          to: post.userId,
          postId: post._id,
        });

        await notification.save();
      }

      post.liked.push(userId);
      post.like += 1;
    }

    await post.save();

    return res.status(200).json({
      message: "Post liked/unliked successfully",
      status: true,
      post,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

app.get("/notifications", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const notifications = await Notification.find({ to: userId }).sort({
      createdAt: -1,
    });

    const updatedWithAvatar = await Promise.all(
      notifications.map(async (notification) => {
        const isCommunity = notification.isCommunity;
        if (isCommunity) {
          const community = await Community.findById(notification.community);
          return {
            ...notification._doc,
            avatar: community.image,
          };
        } else {
          const user = await Account.findById(notification.to);
          return {
            ...notification._doc,
            avatar: user.picture,
          };
        }
      })
    );

    if (!notifications) {
      return res.status(404).json({
        message: "No notifications found",
        status: false,
      });
    }

    return res.status(200).json({
      message: "Notifications fetched successfully",
      status: true,
      notifications: updatedWithAvatar,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

app.delete("/mark-as-read/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndDelete({ _id: id });

    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
        status: false,
      });
    }
    return res.status(200).json({
      message: "Notification marked as read",
      status: true,
      notification,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

app.delete("/delete-notification/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.deleteMany({ to: id });
    if (!notification) {
      return res.status(404).json({
        message: "Notification not found",
        status: false,
      });
    }
    return res.status(200).json({
      message: "Notification deleted successfully",
      status: true,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

app.get("/my-communities", auth, async (req, res) => {
  try {
    const id = req.userId;
    const user = await Account.findById(id);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: false,
      });
    }

    const communities = await Community.find({
      _id: { $in: user.communityId },
    })
      .sort({ createdAt: -1 })
      .select("title");

    if (!communities) {
      return res.status(404).json({
        message: "No communities found",
        status: false,
      });
    }

    return res.status(200).json({
      message: "Communities fetched successfully",
      status: true,
      communities,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

app.post("/comment-like/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const comment = await Comments.findById(id);
    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
        status: false,
      });
    }
    if (comment.liked.includes(userId)) {
      comment.liked = comment.liked.filter(
        (user) => user.toString() !== userId
      );
      comment.likes -= 1;
    } else {
      const user = await Account.findById(userId);
      if (userId !== comment.userId.toString()) {
        const notification = new Notification({
          desc: `${user.name} liked your comment`,
          name: user.name,
          to: comment.userId,
          postId: comment.postId,
        });

        await notification.save();
      }

      comment.liked.push(userId);
      comment.likes += 1;
    }
    await comment.save();
    return res.status(200).json({
      message: "Comment liked/unliked successfully",
      status: true,
      comment,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

app.delete("/delete-comment/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await Comments.findById(id);
    const post = await Post.findById(comment.postId);
    if (post) {
      post.comment = post.comment - 1;
      await post.save();
    }

    if (!comment) {
      return res.status(404).json({
        message: "Comment not found",
        status: false,
      });
    }
    await Comments.findByIdAndDelete(id);
    return res.status(200).json({
      message: "Comment deleted successfully",
      status: true,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

app.post("/save/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const savedPost = await Saved.findOne({ postId: id, userId });
    if (savedPost) {
      await Saved.findByIdAndDelete(savedPost._id);
      return res.status(200).json({
        message: "Post unsaved successfully",
        status: true,
      });
    } else {
      const newSaved = new Saved({ postId: id, userId });
      await newSaved.save();
      return res.status(201).json({
        message: "Post saved successfully",
        status: true,
      });
    }
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

app.get("/saved", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const savedPosts = await Saved.find({ userId });
    const postIds = savedPosts.map((saved) => saved.postId);
    const posts = await Post.find({ _id: { $in: postIds } }).sort({
      createdAt: -1,
    });

    const postsWithUserDetails = await Promise.all(
      posts.map(async (post) => {
        const user = await Account.findById(post.userId);
        return {
          ...post._doc,
          avatar: user.picture,
          username: user.name,
          isSaved: true,
          isLiked: post.liked.includes(userId) ? true : false,
          isEditable: post.userId.toString() === userId,
          isSaved: savedPosts.some(
            (saved) => saved.postId.toString() === post._id.toString()
          )
            ? true
            : false,
        };
      })
    );

    return res.status(200).json({
      message: "Saved posts fetched successfully",
      status: true,
      posts: postsWithUserDetails,
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

const uploadImageToCloudinary = async (base64, fileName) => {
  const stream = await cloudinary.uploader.upload(
    "data:image/png;base64," + base64,
    {
      public_id: fileName,
      overwrite: true,
    }
  );

  return stream.secure_url;
};

app.get("/create-random-post", auth, async (req, res) => {
  try {
    const userId = req.userId;
    const user = await Account.findById(userId);
    const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
    // Art styles, subjects, and scene descriptions for random generation
    const artStyles = [
      "digital art",
      "3D render",
      "oil painting",
      "watercolor",
      "hyper-realistic",
      "cyberpunk",
      "fantasy",
      "surrealism",
      "neo-impressionism",
      "concept art",
    ];

    const subjects = [
      "a dragon",
      "a cosmic entity",
      "a mecha warrior",
      "a mystical creature",
      "a futuristic city",
      "an ancient temple",
      "an ethereal landscape",
      "a celestial being",
      "a steampunk inventor",
      "an underwater civilization",
    ];

    const descriptions = [
      "bathed in golden light",
      "with intricate details",
      "in a misty forest",
      "among floating islands",
      "with vibrant colors",
      "during sunset",
      "with bioluminescent elements",
      "with dramatic lighting",
      "with floating particles",
      "with a magical atmosphere",
    ];

    // Generate random prompt
    const style = artStyles[Math.floor(Math.random() * artStyles.length)];
    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    const description =
      descriptions[Math.floor(Math.random() * descriptions.length)];

    const prompt = `Create a high-quality ${style} of ${subject} ${description}. Make it visually stunning with detailed textures, excellent composition, and dramatic lighting.`;
    const post = prompt;

    // Log the generated prompt
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-preview-image-generation",
      contents: prompt,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    for (const part of response.candidates[0].content.parts) {
      // Based on the part type, either show the text or save the image
      if (part.inlineData) {
        const imageData = part.inlineData.data;
        // Save the image to a file or upload it to a cloud service
        const fileName = `generated_image_${Date.now()}`;

        const uploadResult = await uploadImageToCloudinary(imageData, fileName);
        if (uploadResult) {
          const newPost = new Post({
            name: user.name,
            post: post,
            image: uploadResult,
            userId: userId,
          });

          await newPost.save();

          return res.status(200).json({
            message: "Post created successfully",
            status: true,
            post: newPost,
          });
        } else {
          res.status(500).json({
            message: "Failed to upload image",
            status: false,
          });
        }
      }
    }
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Internal server error",
      status: false,
    });
  }
});

app.listen(PORT, () => {
  console.warn(`Server is listening on port ${PORT}`);
});
