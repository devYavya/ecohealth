import { db, bucket, admin } from "../config/firebase.js";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import { promisify } from "util";
import { writeFile, unlink } from "fs";
import path from "path";
import os from "os";

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

const writeFileAsync = promisify(writeFile);
const unlinkAsync = promisify(unlink);

// Utility to compress and upload image to Firebase Storage
const uploadImage = async (fileBuffer, postId, mimeType) => {
  try {
    // Compress image using sharp
    const compressedBuffer = await sharp(fileBuffer)
      .resize(1080, 1080, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 80,
        progressive: true,
      })
      .toBuffer();

    const file = bucket.file(`posts_images/${postId}.jpg`);
    await file.save(compressedBuffer, {
      metadata: { contentType: "image/jpeg" },
      public: true,
      validation: "md5",
    });

    return `https://storage.googleapis.com/${bucket.name}/posts_images/${postId}.jpg`;
  } catch (error) {
    console.error("Image compression/upload error:", error);
    throw error;
  }
};

// Utility to compress and upload comment image to Firebase Storage
const uploadCommentImage = async (fileBuffer, commentId, mimeType) => {
  try {
    // Check file size (max 10MB for comments)
    if (fileBuffer.length > 10 * 1024 * 1024) {
      throw new Error("Image size exceeds 10MB limit for comments");
    }

    // Compress image using sharp
    const compressedBuffer = await sharp(fileBuffer)
      .resize(800, 800, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 75,
        progressive: true,
      })
      .toBuffer();

    const file = bucket.file(`comment_images/${commentId}.jpg`);
    await file.save(compressedBuffer, {
      metadata: { contentType: "image/jpeg" },
      public: true,
      validation: "md5",
    });

    return `https://storage.googleapis.com/${bucket.name}/comment_images/${commentId}.jpg`;
  } catch (error) {
    console.error("Comment image compression/upload error:", error);
    throw error;
  }
};

// Utility to compress and upload video to Firebase Storage
const uploadVideo = async (fileBuffer, postId, originalMimeType) => {
  const tempDir = os.tmpdir();
  const inputPath = path.join(tempDir, `${postId}_input.mp4`);
  const outputPath = path.join(tempDir, `${postId}_compressed.mp4`);

  try {
    // Write buffer to temporary file
    await writeFileAsync(inputPath, fileBuffer);

    // Compress video using ffmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec("libx264")
        .audioCodec("aac")
        .size("720x?") // Max width 720px, maintain aspect ratio
        .videoBitrate("1000k") // 1 Mbps
        .audioBitrate("128k")
        .duration(30) // Limit to 30 seconds
        .format("mp4")
        .on("end", resolve)
        .on("error", reject)
        .save(outputPath);
    });

    // Read compressed video file
    const { readFile } = await import("fs/promises");
    const compressedBuffer = await readFile(outputPath);

    // Upload to Firebase Storage
    const file = bucket.file(`posts_videos/${postId}.mp4`);
    await file.save(compressedBuffer, {
      metadata: { contentType: "video/mp4" },
      public: true,
      validation: "md5",
    });

    // Clean up temporary files
    await Promise.all([
      unlinkAsync(inputPath).catch(console.warn),
      unlinkAsync(outputPath).catch(console.warn),
    ]);

    return `https://storage.googleapis.com/${bucket.name}/posts_videos/${postId}.mp4`;
  } catch (error) {
    // Clean up temporary files on error
    await Promise.all([
      unlinkAsync(inputPath).catch(() => {}),
      unlinkAsync(outputPath).catch(() => {}),
    ]);
    console.error("Video compression/upload error:", error);
    throw error;
  }
};

// Utility to handle media upload (image or video)
const uploadMedia = async (file, postId) => {
  const { buffer, mimetype } = file;

  // Check file size (max 50MB)
  if (buffer.length > 50 * 1024 * 1024) {
    throw new Error("File size exceeds 50MB limit");
  }

  if (mimetype.startsWith("image/")) {
    return {
      url: await uploadImage(buffer, postId, mimetype),
      type: "image",
    };
  } else if (mimetype.startsWith("video/")) {
    return {
      url: await uploadVideo(buffer, postId, mimetype),
      type: "video",
    };
  } else {
    throw new Error(
      "Unsupported file type. Only images and videos are allowed."
    );
  }
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
    let mediaUrl = null;
    let mediaType = null;

    if (req.file) {
      try {
        const mediaResult = await uploadMedia(req.file, postId);
        mediaUrl = mediaResult.url;
        mediaType = mediaResult.type;
      } catch (uploadError) {
        console.error("Media upload error:", uploadError);
        return res.status(400).json({
          message: uploadError.message || "Failed to upload media",
        });
      }
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
    if (mediaUrl !== null) {
      if (mediaType === "image") {
        postData.imageUrl = mediaUrl;
      } else if (mediaType === "video") {
        postData.videoUrl = mediaUrl;
      }
      postData.mediaType = mediaType;
    }

    await db.collection("posts").doc(postId).set(postData);
    return res.status(201).json({
      message: "Post created successfully",
      post: postData,
    });
  } catch (error) {
    console.error("createPost error:", error);
    res.status(500).json({ message: "Failed to create post" });
  }
};

export const SplashPost = async (req, res) => {
  try {
    // Splash posts are public - user info is optional
    const { uid, name, profilePictureUrl } = req.user || {};

    const postId = uuidv4();
    let mediaUrl = null;
    let mediaType = null;

    if (req.file) {
      try {
        const mediaResult = await uploadMedia(req.file, postId);
        mediaUrl = mediaResult.url;
        mediaType = mediaResult.type;
      } catch (uploadError) {
        console.error("Media upload error:", uploadError);
        return res.status(400).json({
          message: uploadError.message || "Failed to upload media",
        });
      }
    }

    // Create post data, filtering out undefined values
    const postData = {
      postId,
      createdAt: new Date(),
      likedBy: [],
    };

    // Only add fields that are not undefined
    if (name !== undefined) postData.userName = name;
    if (profilePictureUrl !== undefined)
      postData.userProfilePictureUrl = profilePictureUrl;
    if (mediaUrl !== null) {
      if (mediaType === "image") {
        postData.imageUrl = mediaUrl;
      } else if (mediaType === "video") {
        postData.videoUrl = mediaUrl;
      }
      postData.mediaType = mediaType;
    }

    // Delete all previous splash posts before creating new one
    try {
      const previousPosts = await db.collection("splash").get();
      const deletePromises = [];

      previousPosts.forEach((doc) => {
        const prevPostData = doc.data();
        // Delete media from Firebase Storage if it exists
        if (prevPostData.imageUrl) {
          const imagePath = `posts_images/${prevPostData.postId}.jpg`;
          deletePromises.push(
            bucket
              .file(imagePath)
              .delete()
              .catch((err) => {
                console.warn(
                  `Could not delete image ${imagePath}:`,
                  err.message
                );
              })
          );
        }
        if (prevPostData.videoUrl) {
          const videoPath = `posts_videos/${prevPostData.postId}.mp4`;
          deletePromises.push(
            bucket
              .file(videoPath)
              .delete()
              .catch((err) => {
                console.warn(
                  `Could not delete video ${videoPath}:`,
                  err.message
                );
              })
          );
        }
        // Delete document from Firestore
        deletePromises.push(db.collection("splash").doc(doc.id).delete());
      });

      await Promise.all(deletePromises);
      console.log(`Deleted ${previousPosts.size} previous splash posts`);
    } catch (deleteError) {
      console.warn("Error deleting previous splash posts:", deleteError);
      // Continue with creating new post even if deletion fails
    }

    // Create the new splash post
    await db.collection("splash").doc(postId).set(postData);
    return res.status(201).json({
      message: "Post created successfully",
      post: postData,
    });
  } catch (error) {
    console.error("createPost error:", error);
    res.status(500).json({ message: "Failed to create post" });
  }
};

export const OnboardingPost = async (req, res) => {
  try {
    // Splash posts are public - user info is optional
    const { uid, name, profilePictureUrl } = req.user || {};

    const postId = uuidv4();
    let mediaUrl = null;
    let mediaType = null;

    if (req.file) {
      try {
        const mediaResult = await uploadMedia(req.file, postId);
        mediaUrl = mediaResult.url;
        mediaType = mediaResult.type;
      } catch (uploadError) {
        console.error("Media upload error:", uploadError);
        return res.status(400).json({
          message: uploadError.message || "Failed to upload media",
        });
      }
    }

    // Create post data, filtering out undefined values
    const postData = {
      postId,
      createdAt: new Date(),
      likedBy: [],
    };

    // Only add fields that are not undefined
    if (name !== undefined) postData.userName = name;
    if (profilePictureUrl !== undefined)
      postData.userProfilePictureUrl = profilePictureUrl;
    if (mediaUrl !== null) {
      if (mediaType === "image") {
        postData.imageUrl = mediaUrl;
      } else if (mediaType === "video") {
        postData.videoUrl = mediaUrl;
      }
      postData.mediaType = mediaType;
    }

    // Delete all previous onboarding posts before creating new one
    try {
      const previousPosts = await db.collection("onboarding").get();
      const deletePromises = [];

      previousPosts.forEach((doc) => {
        const prevPostData = doc.data();
        // Delete media from Firebase Storage if it exists
        if (prevPostData.imageUrl) {
          const imagePath = `posts_images/${prevPostData.postId}.jpg`;
          deletePromises.push(
            bucket
              .file(imagePath)
              .delete()
              .catch((err) => {
                console.warn(
                  `Could not delete image ${imagePath}:`,
                  err.message
                );
              })
          );
        }
        if (prevPostData.videoUrl) {
          const videoPath = `posts_videos/${prevPostData.postId}.mp4`;
          deletePromises.push(
            bucket
              .file(videoPath)
              .delete()
              .catch((err) => {
                console.warn(
                  `Could not delete video ${videoPath}:`,
                  err.message
                );
              })
          );
        }
        // Delete document from Firestore
        deletePromises.push(db.collection("onboarding").doc(doc.id).delete());
      });

      await Promise.all(deletePromises);
      console.log(`Deleted ${previousPosts.size} previous onboarding posts`);
    } catch (deleteError) {
      console.warn("Error deleting previous onboarding posts:", deleteError);
      // Continue with creating new post even if deletion fails
    }

    // Create the new onboarding post
    await db.collection("onboarding").doc(postId).set(postData);
    return res.status(201).json({
      message: "Post created successfully",
      post: postData,
    });
  } catch (error) {
    console.error("createPost error:", error);
    res.status(500).json({ message: "Failed to create post" });
  }
};

/**
 * Get splash posts with pagination
 * @route GET /api/feed/splash
 */
export const getSplashPosts = async (req, res) => {
  try {
    const { limit = 10, lastPostId } = req.query;
    const pageLimit = Math.min(parseInt(limit) || 10, 50); // Cap at 50

    // Query all splash posts (simple approach that works without indexes)
    let query = db.collection("splash");

    const snapshot = await query.get();

    if (snapshot.empty) {
      console.log("No splash posts found");
      return res.status(200).json({
        success: true,
        message: "Splash posts retrieved successfully",
        data: {
          posts: [],
          hasMore: false,
          lastPostId: null,
          count: 0,
        },
      });
    }

    const allPosts = [];

    // Convert all posts and sort by createdAt in descending order
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Convert Firestore timestamp to ISO string if it exists
      const createdAt =
        data.createdAt?.toDate?.() || data.createdAt || new Date();

      allPosts.push({
        postId: doc.id,
        ...data,
        createdAt:
          createdAt instanceof Date ? createdAt.toISOString() : createdAt,
      });
    });

    // Sort by createdAt in descending order (newest first)
    allPosts.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA; // Descending order
    });

    // Handle pagination
    let startIndex = 0;
    if (lastPostId) {
      startIndex = allPosts.findIndex((post) => post.postId === lastPostId) + 1;
    }

    const posts = allPosts.slice(startIndex, startIndex + pageLimit);
    const hasMore = startIndex + pageLimit < allPosts.length;
    const lastPost = posts[posts.length - 1];

    console.log(
      `Fetched ${posts.length} splash posts from index ${startIndex}, total: ${allPosts.length}, hasMore: ${hasMore}`
    );

    return res.status(200).json({
      success: true,
      message: "Splash posts retrieved successfully",
      data: {
        posts,
        hasMore,
        lastPostId: lastPost ? lastPost.postId : null,
        count: posts.length,
      },
    });
  } catch (error) {
    console.error("getSplashPosts error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve splash posts",
      error: error.message,
    });
  }
};

export const getOnboardingPosts = async (req, res) => {
  try {
    const { limit = 10, lastPostId } = req.query;
    const pageLimit = Math.min(parseInt(limit) || 10, 50); // Cap at 50

    // Query all onboarding posts (simple approach that works without indexes)
    let query = db.collection("onboarding");

    const snapshot = await query.get();

    if (snapshot.empty) {
      console.log("No onboarding posts found");
      return res.status(200).json({
        success: true,
        message: "Onboarding posts retrieved successfully",
        data: {
          posts: [],
          hasMore: false,
          lastPostId: null,
          count: 0,
        },
      });
    }

    const allPosts = [];

    // Convert all posts and sort by createdAt in descending order
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Convert Firestore timestamp to ISO string if it exists
      const createdAt =
        data.createdAt?.toDate?.() || data.createdAt || new Date();

      allPosts.push({
        postId: doc.id,
        ...data,
        createdAt:
          createdAt instanceof Date ? createdAt.toISOString() : createdAt,
      });
    });

    // Sort by createdAt in descending order (newest first)
    allPosts.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA; // Descending order
    });

    // Handle pagination
    let startIndex = 0;
    if (lastPostId) {
      startIndex = allPosts.findIndex((post) => post.postId === lastPostId) + 1;
    }

    const posts = allPosts.slice(startIndex, startIndex + pageLimit);
    const hasMore = startIndex + pageLimit < allPosts.length;
    const lastPost = posts[posts.length - 1];

    console.log(
      `Fetched ${posts.length} onboarding posts from index ${startIndex}, total: ${allPosts.length}, hasMore: ${hasMore}`
    );

    return res.status(200).json({
      success: true,
      message: "Onboarding posts retrieved successfully",
      data: {
        posts,
        hasMore,
        lastPostId: lastPost ? lastPost.postId : null,
        count: posts.length,
      },
    });
  } catch (error) {
    console.error("getSplashPosts error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve splash posts",
      error: error.message,
    });
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
      console.log("Post Data:", postData);

      // Fetch user details for the post author
      let userName = "Unknown User";
      let userProfilePicture = null;

      if (postData.userId) {
        try {
          const userDoc = await db
            .collection("users")
            .doc(postData.userId)
            .get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            userName =
              userData.name || userData.displayName || "Anonymous User";
            userProfilePicture =
              userData.profilePictureUrl || userData.photoURL || null;
          }
        } catch (userError) {
          console.error("Error fetching user data:", userError);
          // Keep default values if user fetch fails
        }
      }

      // Check if current user liked this post
      const isLikedByUser = postData.likedBy && postData.likedBy.includes(uid);

      // Get recent comments (limit to 3) with commenter names
      const commentsSnapshot = await db
        .collection("posts")
        .doc(doc.id)
        .collection("comments")
        .orderBy("createdAt", "desc")
        .limit(3)
        .get();

      const comments = [];
      for (const commentDoc of commentsSnapshot.docs) {
        const commentData = commentDoc.data();

        // Fetch commenter's name
        let commenterName = "Unknown User";
        if (commentData.userId) {
          try {
            const commenterDoc = await db
              .collection("users")
              .doc(commentData.userId)
              .get();
            if (commenterDoc.exists) {
              const commenterUserData = commenterDoc.data();
              commenterName =
                commenterUserData.name ||
                commenterUserData.displayName ||
                "Anonymous User";
            }
          } catch (commenterError) {
            console.error("Error fetching commenter data:", commenterError);
          }
        }

        comments.push({
          ...commentData,
          userName: commenterName,
        });
      }

      posts.push({
        ...postData,
        userName,
        userProfilePicture,
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
    const comments = [];

    // Fetch user details for each comment
    for (const doc of snapshot.docs) {
      const commentData = doc.data();

      // Fetch commenter's name and profile picture
      let userName = "Unknown User";
      let userProfilePicture = null;

      if (commentData.userId) {
        try {
          const userDoc = await db
            .collection("users")
            .doc(commentData.userId)
            .get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            userName =
              userData.name || userData.displayName || "Anonymous User";
            userProfilePicture =
              userData.profilePictureUrl || userData.photoURL || null;
          }
        } catch (userError) {
          console.error("Error fetching commenter data:", userError);
          // Keep default values if user fetch fails
        }
      }

      comments.push({
        ...commentData,
        userName,
        userProfilePicture,
        commentId: doc.id, // Include document ID for pagination
      });
    }

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

// Delete post (Admin only)
export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const adminUid = req.admin.uid;

    // Check if post exists
    const postDoc = await db.collection("posts").doc(postId).get();

    if (!postDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const postData = postDoc.data();

    // Delete media from storage if it exists
    if (postData.imageUrl) {
      try {
        const imagePath = `posts_images/${postId}.jpg`;
        await bucket.file(imagePath).delete();
        console.log(`🗑️ Deleted image: ${imagePath}`);
      } catch (imageError) {
        console.warn(
          `⚠️ Failed to delete image for post ${postId}:`,
          imageError.message
        );
      }
    }

    if (postData.videoUrl) {
      try {
        const videoPath = `posts_videos/${postId}.mp4`;
        await bucket.file(videoPath).delete();
        console.log(`🗑️ Deleted video: ${videoPath}`);
      } catch (videoError) {
        console.warn(
          `⚠️ Failed to delete video for post ${postId}:`,
          videoError.message
        );
      }
    }

    // Delete all comments for this post
    const commentsSnapshot = await db
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .get();

    const batch = db.batch();

    // Add all comment deletions to batch
    commentsSnapshot.docs.forEach((commentDoc) => {
      batch.delete(commentDoc.ref);
    });

    // Delete the main post document
    batch.delete(db.collection("posts").doc(postId));

    // Execute batch delete
    await batch.commit();

    // Log the deletion for audit purposes
    await db.collection("admin_logs").add({
      action: "DELETE_POST",
      adminUid,
      adminEmail: req.admin.email,
      postId,
      postOwnerId: postData.userId,
      postOwnerName: postData.userName,
      postContent: postData.textContent?.substring(0, 100) + "...", // First 100 chars
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      commentsDeleted: commentsSnapshot.size,
      mediaType: postData.mediaType || (postData.imageUrl ? "image" : null),
    });

    return res.status(200).json({
      success: true,
      message: "Post deleted successfully",
      data: {
        postId,
        postOwnerId: postData.userId,
        commentsDeleted: commentsSnapshot.size,
        hadImage: !!postData.imageUrl,
        hadVideo: !!postData.videoUrl,
        mediaType: postData.mediaType,
      },
    });
  } catch (error) {
    console.error("deletePost error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete post",
    });
  }
};

// Delete user's own post
export const deleteUserPost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { uid } = req.user;

    // Check if post exists
    const postDoc = await db.collection("posts").doc(postId).get();

    if (!postDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const postData = postDoc.data();

    // Check if user owns this post
    if (postData.userId !== uid) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own posts",
      });
    }

    // Delete media from storage if it exists
    if (postData.imageUrl) {
      try {
        const imagePath = `posts_images/${postId}.jpg`;
        await bucket.file(imagePath).delete();
        console.log(`🗑️ User deleted image: ${imagePath}`);
      } catch (imageError) {
        console.warn(
          `⚠️ Failed to delete image for post ${postId}:`,
          imageError.message
        );
      }
    }

    if (postData.videoUrl) {
      try {
        const videoPath = `posts_videos/${postId}.mp4`;
        await bucket.file(videoPath).delete();
        console.log(`🗑️ User deleted video: ${videoPath}`);
      } catch (videoError) {
        console.warn(
          `⚠️ Failed to delete video for post ${postId}:`,
          videoError.message
        );
      }
    }

    // Delete all comments for this post
    const commentsSnapshot = await db
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .get();

    const batch = db.batch();

    // Add all comment deletions to batch
    commentsSnapshot.docs.forEach((commentDoc) => {
      batch.delete(commentDoc.ref);
    });

    // Delete the main post document
    batch.delete(db.collection("posts").doc(postId));

    // Execute batch delete
    await batch.commit();

    console.log(`✅ User ${uid} deleted their post ${postId}`);

    return res.status(200).json({
      success: true,
      message: "Your post has been deleted successfully",
      data: {
        postId,
        commentsDeleted: commentsSnapshot.size,
        hadImage: !!postData.imageUrl,
        hadVideo: !!postData.videoUrl,
        mediaType: postData.mediaType,
      },
    });
  } catch (error) {
    console.error("deleteUserPost error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete post",
    });
  }
};

// Delete user's own comment
export const deleteUserComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { uid } = req.user;

    // Check if comment exists
    const commentDoc = await db
      .collection("posts")
      .doc(postId)
      .collection("comments")
      .doc(commentId)
      .get();

    if (!commentDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    const commentData = commentDoc.data();

    // Check if user owns this comment
    if (commentData.userId !== uid) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own comments",
      });
    }

    // Delete the comment
    await commentDoc.ref.delete();

    // Update post's comment count
    const postRef = db.collection("posts").doc(postId);
    await postRef.update({
      commentsCount: admin.firestore.FieldValue.increment(-1),
    });

    console.log(
      `✅ User ${uid} deleted their comment ${commentId} on post ${postId}`
    );

    return res.status(200).json({
      success: true,
      message: "Your comment has been deleted successfully",
      data: {
        postId,
        commentId,
      },
    });
  } catch (error) {
    console.error("deleteUserComment error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete comment",
    });
  }
};

export const getComments = async (req, res) => {
  try {
    // Static doc ID for comments
    const docId = "default";

    // Example: user ID could be static or dynamic (e.g., from token or params)
    const { uid } = req.user;
    const userId = uid;

    if (!docId || typeof docId !== "string" || docId.trim() === "") {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    // 1️⃣ Fetch comments from "community_comments/default"
    const commentsRef = db.collection("community_comments").doc(docId);
    const commentsSnap = await commentsRef.get();

    if (!commentsSnap.exists) {
      return res.status(404).json({ error: "No comments found" });
    }

    const commentsData = commentsSnap.data();

    // 2️⃣ Fetch carbon footprint from "users/{userId}/carbonProfile/baseline"
    const carbonRef = db
      .collection("users")
      .doc(userId)
      .collection("carbonProfile")
      .doc("baseline");

    const carbonSnap = await carbonRef.get();

    if (!carbonSnap.exists) {
      return res.status(404).json({ error: "No carbon profile found" });
    }

    const carbonData = carbonSnap.data();
    const totalCarbonFootprint = carbonData?.totalCarbonFootprint;
    const unit = carbonData?.unit || "kg CO2e per day";
    const updatedComments = {
      ...commentsData,
      c9: `My reduced carbon footprint is ${totalCarbonFootprint} ${unit}`,
    };

    // 3️⃣ Combine into one response
    const footprintMessage = totalCarbonFootprint
      ? `C9 says: My reduced carbon footprint is ${totalCarbonFootprint} ${unit}`
      : "C9 says: Carbon footprint data not available.";

    return res.status(200).json({
      message: "Comments and carbon footprint fetched successfully",
      data: {
        comments: updatedComments,
        footprintMessage,
        totalCarbonFootprint,
        unit,
      },
    });
  } catch (error) {
    console.error("getComments error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
