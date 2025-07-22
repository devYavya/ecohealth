import express from "express";
import multer from "multer";
import { verifyToken } from "../middlewares/auth.middleware.js";
import {
  createPost,
  toggleLike as likePost,
  addComment,
  getAllPosts,
  getPostComments,
} from "../controllers/socialFeed.controller.js";

const router = express.Router();

// Multer config for image upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

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
 *     summary: Create a new post (text + optional image)
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
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Post created successfully
 *       400:
 *         description: Validation error or missing fields
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

router.post("/create", verifyToken, upload.single("image"), createPost);

router.get("/posts", verifyToken, getAllPosts);

router.post("/:postId/like", verifyToken, likePost);

router.post("/:postId/comment", verifyToken, addComment);

router.get("/:postId/comments", verifyToken, getPostComments);

export default router;
