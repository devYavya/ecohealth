import express from "express";
import multer from "multer";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { verifyAdmin } from "../middlewares/admin.middleware.js";
import {
  createPost,
  toggleLike as likePost,
  addComment,
  getAllPosts,
  getPostComments,
  deletePost,
  deleteUserPost,
  deleteUserComment,
  getComments,
  SplashPost,
  getSplashPosts,
} from "../controllers/socialFeed.controller.js";

const router = express.Router();

// Multer config for image and video upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("video/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only image and video files are allowed"), false);
    }
  },
});

// POST /api/social-feed/post (text + optional image)
/**
 * @swagger
 * tags:
 *   name: SocialFeed
 *   description: Social feed endpoints
 */

/**
 * @swagger
 * /api/feed/create:
 *   post:
 *     summary: Create a new post (text + optional image or video)
 *     tags: [SocialFeed]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - textContent
 *             properties:
 *               textContent:
 *                 type: string
 *                 maxLength: 500
 *                 example: "My eco-friendly achievement today!"
 *               media:
 *                 type: string
 *                 format: binary
 *                 description: "Upload an image or video file - max 50MB. Images will be compressed to 1080px max resolution. Videos will be compressed to 720p and limited to 30 seconds."
 *     responses:
 *       201:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Post created successfully"
 *                 post:
 *                   type: object
 *                   properties:
 *                     postId:
 *                       type: string
 *                       example: "uuid-here"
 *                     userId:
 *                       type: string
 *                     textContent:
 *                       type: string
 *                     imageUrl:
 *                       type: string
 *                       description: "Present if an image was uploaded"
 *                     videoUrl:
 *                       type: string
 *                       description: "Present if a video was uploaded"
 *                     mediaType:
 *                       type: string
 *                       enum: [image, video]
 *                       description: "Type of media uploaded"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Validation error, unsupported file type, or file too large
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   examples:
 *                     - "Text content required (max 500 chars)"
 *                     - "File size exceeds 50MB limit"
 *                     - "Unsupported file type. Only images and videos are allowed."
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/feed/{postId}/like:
 *   post:
 *     summary: Toggle like on a post
 *     tags: [SocialFeed]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the post to like/unlike
 *     responses:
 *       200:
 *         description: Like status toggled
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/feed/{postId}/comment:
 *   post:
 *     summary: Add a comment to a post
 *     tags: [SocialFeed]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the post to comment on
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [textContent]
 *             properties:
 *               textContent:
 *                 type: string
 *                 example: "Great post!"
 *     responses:
 *       201:
 *         description: Comment added successfully
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/feed/posts:
 *   get:
 *     summary: Get all posts with pagination
 *     tags: [SocialFeed]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of posts to retrieve
 *       - in: query
 *         name: lastPostId
 *         schema:
 *           type: string
 *         description: ID of the last post from previous page (for pagination)
 *     responses:
 *       200:
 *         description: Posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 posts:
 *                   type: array
 *                   items:
 *                     type: object
 *                 hasMore:
 *                   type: boolean
 *                 lastPostId:
 *                   type: string
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/feed/{postId}/comments:
 *   get:
 *     summary: Get comments for a specific post
 *     tags: [SocialFeed]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the post
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of comments to retrieve
 *       - in: query
 *         name: lastCommentId
 *         schema:
 *           type: string
 *         description: ID of the last comment from previous page (for pagination)
 *     responses:
 *       200:
 *         description: Comments retrieved successfully
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/feed/{postId}:
 *   delete:
 *     summary: Delete your own post
 *     tags: [SocialFeed]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the post to delete
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Your post has been deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     postId:
 *                       type: string
 *                       example: "post123"
 *                     commentsDeleted:
 *                       type: integer
 *                       example: 5
 *                     hadImage:
 *                       type: boolean
 *                       example: true
 *                     hadVideo:
 *                       type: boolean
 *                       example: false
 *                     mediaType:
 *                       type: string
 *                       enum: [image, video]
 *                       example: "image"
 *       401:
 *         description: Unauthorized - Token required
 *       403:
 *         description: Forbidden - You can only delete your own posts
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/feed/{postId}/comments/{commentId}:
 *   delete:
 *     summary: Delete your own comment
 *     tags: [SocialFeed]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the post containing the comment
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the comment to delete
 *     responses:
 *       200:
 *         description: Comment deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Your comment has been deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     postId:
 *                       type: string
 *                       example: "post123"
 *                     commentId:
 *                       type: string
 *                       example: "comment456"
 *       401:
 *         description: Unauthorized - Token required
 *       403:
 *         description: Forbidden - You can only delete your own comments
 *       404:
 *         description: Comment not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/feed/allcomments:
 *   get:
 *     summary: Get all community post comments
 *     description: Fetch all environment-related community comments with their keys (c1, c2, ...).
 *     tags:
 *       - Comments
 *     security:
 *       - bearerAuth: [] # 🔐 JWT Token required (verifyToken middleware)
 *     responses:
 *       200:
 *         description: Successfully fetched all comments
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Comments fetched successfully
 *                 data:
 *                   type: object
 *                   example:
 *                     c1: "Switching to public transport or carpooling has really helped me cut down on fuel use and costs."
 *                     c2: "I’ve started eating more local and seasonal food — it’s healthier and reduces carbon emissions from transport."
 *                     c3: "We should turn off unnecessary lights and appliances. Even small electricity savings add up!"
 *       401:
 *         description: Unauthorized — missing or invalid JWT token
 *       404:
 *         description: No comments found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/feed/{postId}/delete:
 *   delete:
 *     summary: Delete a post (Admin only)
 *     tags: [SocialFeed]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: postId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the post to delete
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Post deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     postId:
 *                       type: string
 *                       example: "post123"
 *                     postOwnerId:
 *                       type: string
 *                       example: "user456"
 *                     commentsDeleted:
 *                       type: integer
 *                       example: 5
 *                     hadImage:
 *                       type: boolean
 *                       example: true
 *                     hadVideo:
 *                       type: boolean
 *                       example: false
 *                     mediaType:
 *                       type: string
 *                       enum: [image, video]
 *                       example: "image"
 *       401:
 *         description: Unauthorized - Token required
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Post not found
 *       500:
 *         description: Internal server error
 */

router.post("/create", verifyToken, upload.single("media"), createPost);

/**
 * @swagger
 * /api/feed/splash:
 *   post:
 *     summary: Create a splash post (public post without authentication)
 *     description: Create a public post without requiring user authentication. Can include text and/or media (image or video). Perfect for anonymous or guest contributions to the splash board.
 *     tags: [SocialFeed]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               textContent:
 *                 type: string
 *                 maxLength: 500
 *                 example: "Check out this amazing eco-friendly initiative!"
 *                 description: Optional text content for the splash post (max 500 characters)
 *               media:
 *                 type: string
 *                 format: binary
 *                 description: "Optional image or video file - max 50MB. Images will be compressed to 1080px max resolution. Videos will be compressed to 720p and limited to 30 seconds."
 *     responses:
 *       201:
 *         description: Splash post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Post created successfully"
 *                 post:
 *                   type: object
 *                   properties:
 *                     postId:
 *                       type: string
 *                       example: "550e8400-e29b-41d4-a716-446655440000"
 *                     textContent:
 *                       type: string
 *                       description: "Text content if provided"
 *                     imageUrl:
 *                       type: string
 *                       description: "URL of uploaded image if applicable"
 *                     videoUrl:
 *                       type: string
 *                       description: "URL of uploaded video if applicable"
 *                     mediaType:
 *                       type: string
 *                       enum: [image, video]
 *                       description: "Type of media uploaded"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-10-30T10:30:00.000Z"
 *                     likedBy:
 *                       type: array
 *                       example: []
 *       400:
 *         description: Validation error or file upload issue
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   examples:
 *                     - "Text content required (max 500 chars)"
 *                     - "File size exceeds 50MB limit"
 *                     - "Unsupported file type. Only images and videos are allowed."
 *                     - "Failed to upload media"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Failed to create post"
 */

router.post("/splash", upload.single("media"), SplashPost);

/**
 * @swagger
 * /api/feed/splash:
 *   get:
 *     summary: Get all splash posts with pagination
 *     description: Retrieve public splash posts in reverse chronological order (newest first). No authentication required.
 *     tags: [SocialFeed]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *         description: Number of posts to retrieve (max 50)
 *       - in: query
 *         name: lastPostId
 *         schema:
 *           type: string
 *         description: ID of the last post from previous page (for pagination)
 *     responses:
 *       200:
 *         description: Splash posts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Splash posts retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     posts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           postId:
 *                             type: string
 *                             example: "550e8400-e29b-41d4-a716-446655440000"
 *                           userName:
 *                             type: string
 *                             description: "Name of post creator (if provided)"
 *                           userProfilePictureUrl:
 *                             type: string
 *                             description: "Profile picture URL of post creator (if provided)"
 *                           textContent:
 *                             type: string
 *                             example: "Check out this amazing eco-friendly initiative!"
 *                           imageUrl:
 *                             type: string
 *                             description: "URL of uploaded image (if applicable)"
 *                           videoUrl:
 *                             type: string
 *                             description: "URL of uploaded video (if applicable)"
 *                           mediaType:
 *                             type: string
 *                             enum: [image, video]
 *                             description: "Type of media (if any)"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-10-30T10:30:00.000Z"
 *                           likedBy:
 *                             type: array
 *                             description: "Array of user IDs who liked the post"
 *                     hasMore:
 *                       type: boolean
 *                       example: true
 *                       description: "Whether more posts are available"
 *                     lastPostId:
 *                       type: string
 *                       description: "ID of the last post in this page (use for next pagination)"
 *                     count:
 *                       type: integer
 *                       example: 10
 *                       description: "Number of posts returned in this page"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to retrieve splash posts"
 */

router.get("/splash", getSplashPosts);

router.get("/posts", verifyToken, getAllPosts);
router.post("/:postId/like", verifyToken, likePost);

router.post("/:postId/comment", verifyToken, addComment);

router.get("/:postId/comments", verifyToken, getPostComments);

router.get("/allcomments", verifyToken, getComments);

// Admin only route to delete posts
router.delete("/:postId/delete", verifyToken, verifyAdmin, deletePost);

// User routes to delete their own posts and comments
router.delete("/:postId", verifyToken, deleteUserPost);
router.delete("/:postId/comments/:commentId", verifyToken, deleteUserComment);

export default router;
