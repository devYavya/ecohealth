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
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({
        quality: 80,
        progressive: true
      })
      .toBuffer();

    const file = bucket.file(`posts_images/${postId}.jpg`);
    await file.save(compressedBuffer, {
      metadata: { contentType: 'image/jpeg' },
      public: true,
      validation: "md5",
    });

    return `https://storage.googleapis.com/${bucket.name}/posts_images/${postId}.jpg`;
  } catch (error) {
    console.error('Image compression/upload error:', error);
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
        .videoCodec('libx264')
        .audioCodec('aac')
        .size('720x?') // Max width 720px, maintain aspect ratio
        .videoBitrate('1000k') // 1 Mbps
        .audioBitrate('128k')
        .duration(30) // Limit to 30 seconds
        .format('mp4')
        .on('end', resolve)
        .on('error', reject)
        .save(outputPath);
    });

    // Read compressed video file
    const { readFile } = await import('fs/promises');
    const compressedBuffer = await readFile(outputPath);

    // Upload to Firebase Storage
    const file = bucket.file(`posts_videos/${postId}.mp4`);
    await file.save(compressedBuffer, {
      metadata: { contentType: 'video/mp4' },
      public: true,
      validation: "md5",
    });

    // Clean up temporary files
    await Promise.all([
      unlinkAsync(inputPath).catch(console.warn),
      unlinkAsync(outputPath).catch(console.warn)
    ]);

    return `https://storage.googleapis.com/${bucket.name}/posts_videos/${postId}.mp4`;
  } catch (error) {
    // Clean up temporary files on error
    await Promise.all([
      unlinkAsync(inputPath).catch(() => {}),
      unlinkAsync(outputPath).catch(() => {})
    ]);
    console.error('Video compression/upload error:', error);
    throw error;
  }
};

// Utility to handle media upload (image or video)
const uploadMedia = async (file, postId) => {
  const { buffer, mimetype } = file;
  
  // Check file size (max 50MB)
  if (buffer.length > 50 * 1024 * 1024) {
    throw new Error('File size exceeds 50MB limit');
  }

  if (mimetype.startsWith('image/')) {
    return {
      url: await uploadImage(buffer, postId, mimetype),
      type: 'image'
    };
  } else if (mimetype.startsWith('video/')) {
    return {
      url: await uploadVideo(buffer, postId, mimetype),
      type: 'video'
    };
  } else {
    throw new Error('Unsupported file type. Only images and videos are allowed.');
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
          message: uploadError.message || "Failed to upload media" 
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
      if (mediaType === 'image') {
        postData.imageUrl = mediaUrl;
      } else if (mediaType === 'video') {
        postData.videoUrl = mediaUrl;
      }
      postData.mediaType = mediaType;
    }

    await db.collection("posts").doc(postId).set(postData);
    return res.status(201).json({ 
      message: "Post created successfully", 
      post: postData 
    });
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
      mediaType: postData.mediaType || (postData.imageUrl ? 'image' : null),
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
