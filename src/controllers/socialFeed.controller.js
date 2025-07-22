import { db, bucket, admin } from "../config/firebase.js";
import { v4 as uuidv4 } from "uuid";

// Utility to upload image to Firebase Storage
const uploadImage = async (fileBuffer, postId, mimeType) => {
  const file = bucket.file(`posts_images/${postId}.jpg`);
  await file.save(fileBuffer, {
    metadata: { contentType: mimeType },
    public: true,
    validation: "md5",
  });
  return `https://storage.googleapis.com/${bucket.name}/posts_images/${postId}.jpg`;
};

// Create a new post
export const createPost = async (req, res) => {
  try {
    const { textContent } = req.body;
    const { uid, name, profilePictureUrl } = req.user;

    if (!textContent || textContent.length > 500) {
      return res
        .status(400)
        .json({ message: "Text content required (max 500 chars)" });
    }

    const postId = uuidv4();
    let imageUrl = null;

    if (req.file) {
      imageUrl = await uploadImage(req.file.buffer, postId, req.file.mimetype);
    }

    // Create post data, filtering out undefined values
    const postData = {
      postId,
      userId: uid,
      textContent,
      createdAt: new Date(),
      likesCount: 0,
      commentsCount: 0,
      likedBy: [],
    };

    // Only add fields that are not undefined
    if (name !== undefined) postData.userName = name;
    if (profilePictureUrl !== undefined)
      postData.userProfilePictureUrl = profilePictureUrl;
    if (imageUrl !== null) postData.imageUrl = imageUrl;

    await db.collection("posts").doc(postId).set(postData);
    return res.status(201).json({ message: "Post created", post: postData });
  } catch (error) {
    console.error("createPost error:", error);
    res.status(500).json({ message: "Failed to create post" });
  }
};

// Like or Unlike a post
export const toggleLike = async (req, res) => {
  try {
    const { postId } = req.params;
    const { uid } = req.user;

    const postRef = db.collection("posts").doc(postId);
    const postSnap = await postRef.get();

    if (!postSnap.exists)
      return res.status(404).json({ message: "Post not found" });

    const postData = postSnap.data();
    const likedBy = postData.likedBy || [];

    let update = {};
    if (likedBy.includes(uid)) {
      update = {
        likesCount: postData.likesCount - 1,
        likedBy: likedBy.filter((id) => id !== uid),
      };
    } else {
      update = {
        likesCount: postData.likesCount + 1,
        likedBy: [...likedBy, uid],
      };
    }

    await postRef.update(update);
    return res.status(200).json({ message: "Post like toggled" });
  } catch (error) {
    console.error("toggleLike error:", error);
    res.status(500).json({ message: "Failed to toggle like" });
  }
};

// Comment on a post
export const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { textContent } = req.body;
    const { uid, name, profilePictureUrl } = req.user;

    if (!textContent)
      return res.status(400).json({ message: "Comment content required" });

    const commentId = uuidv4();

    // Create comment data, filtering out undefined values
    const commentData = {
      commentId,
      userId: uid,
      textContent,
      createdAt: new Date(),
    };

    // Only add fields that are not undefined
    if (name !== undefined) commentData.userName = name;
    if (profilePictureUrl !== undefined)
      commentData.userProfilePictureUrl = profilePictureUrl;

    const commentRef = db
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .doc(commentId);
    await commentRef.set(commentData);

    const postRef = db.collection("posts").doc(postId);
    await postRef.update({
      commentsCount: admin.firestore.FieldValue.increment(1),
    });

    return res
      .status(201)
      .json({ message: "Comment added", comment: commentData });
  } catch (error) {
    console.error("addComment error:", error);
    res.status(500).json({ message: "Failed to add comment" });
  }
};

// Get all posts with pagination
export const getAllPosts = async (req, res) => {
  try {
    const { limit = 10, lastPostId } = req.query;
    const { uid } = req.user;

    let query = db
      .collection("posts")
      .orderBy("createdAt", "desc")
      .limit(parseInt(limit));

    if (lastPostId) {
      const lastPostDoc = await db.collection("posts").doc(lastPostId).get();
      if (lastPostDoc.exists) {
        query = query.startAfter(lastPostDoc);
      }
    }

    const snapshot = await query.get();
    const posts = [];

    for (const doc of snapshot.docs) {
      const postData = doc.data();

      // Check if current user liked this post
      const isLikedByUser = postData.likedBy && postData.likedBy.includes(uid);

      // Get recent comments (limit to 3)
      const commentsSnapshot = await db
        .collection("posts")
        .doc(doc.id)
        .collection("comments")
        .orderBy("createdAt", "desc")
        .limit(3)
        .get();

      const comments = commentsSnapshot.docs.map((commentDoc) =>
        commentDoc.data()
      );

      posts.push({
        ...postData,
        isLikedByUser,
        recentComments: comments,
        hasMoreComments: postData.commentsCount > 3,
      });
    }

    return res.status(200).json({
      posts,
      hasMore: snapshot.docs.length === parseInt(limit),
      lastPostId:
        snapshot.docs.length > 0
          ? snapshot.docs[snapshot.docs.length - 1].id
          : null,
    });
  } catch (error) {
    console.error("getAllPosts error:", error);
    res.status(500).json({ message: "Failed to fetch posts" });
  }
};

// Get comments for a specific post
export const getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { limit = 10, lastCommentId } = req.query;

    let query = db
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .orderBy("createdAt", "desc")
      .limit(parseInt(limit));

    if (lastCommentId) {
      const lastCommentDoc = await db
        .collection("posts")
        .doc(postId)
        .collection("comments")
        .doc(lastCommentId)
        .get();
      if (lastCommentDoc.exists) {
        query = query.startAfter(lastCommentDoc);
      }
    }

    const snapshot = await query.get();
    const comments = snapshot.docs.map((doc) => doc.data());

    return res.status(200).json({
      comments,
      hasMore: snapshot.docs.length === parseInt(limit),
      lastCommentId:
        snapshot.docs.length > 0
          ? snapshot.docs[snapshot.docs.length - 1].id
          : null,
    });
  } catch (error) {
    console.error("getPostComments error:", error);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
};
