import express from "express";
const router = express.Router();
import {
  getUserProfile,
  updateUserProfile,
  upsertUserProfile,
  checkProfileCompletion,
} from "../controllers/user.controller.js";
import {
  uploadProfilePicture,
  uploadMiddleware,
  handleUploadErrors,
} from "../controllers/upload.controller.js";
import {
  verifyToken,
  requireCompleteProfile,
} from "../middlewares/auth.middleware.js";
import {
  validateRequest,
  profileSchema,
} from "../middlewares/validation.middleware.js";
import { generalLimiter } from "../middlewares/rateLimiter.middleware.js";
/**
 * @swagger
 * tags:
 *   name: User
 *   description: User profile management APIs
 */

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 uid:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 age:
 *                   type: integer
 *                 gender:
 *                   type: string
 *                 bloodGroup:
 *                   type: string
 *                 profilePictureUrl:
 *                   type: string
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/user/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               age:
 *                 type: integer
 *                 example: 25
 *               gender:
 *                 type: string
 *                 example: Male
 *               bloodGroup:
 *                 type: string
 *                 example: B+
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */

/**
 * @swagger
 * /api/user/profile:
 *   post:
 *     summary: Create or update user profile (upsert)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - age
 *               - gender
 *               - bloodGroup
 *             properties:
 *               name:
 *                 type: string
 *                 example: Amit Sharma
 *               age:
 *                 type: integer
 *                 example: 24
 *               gender:
 *                 type: string
 *                 example: Male
 *               bloodGroup:
 *                 type: string
 *                 example: O+
 *     responses:
 *       200:
 *         description: Profile created or updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Profile updated
 *                 data:
 *                   type: object
 *                   properties:
 *                     uid:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     age:
 *                       type: integer
 *                     gender:
 *                       type: string
 *                     bloodGroup:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     lastUpdatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal Server Error
 */

/**
 * @swagger
 * /api/user/profile-picture:
 *   post:
 *     summary: Upload or update profile picture
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profilePicture:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile picture uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Profile picture uploaded successfully
 *                 profilePictureUrl:
 *                   type: string
 *                   example: https://storage.googleapis.com/your-bucket/profile_pictures/uid.jpg
 *       400:
 *         description: No file uploaded
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to upload profile picture
 */

// Routes with authentication and validation
router.get("/profile", generalLimiter, verifyToken, getUserProfile);
router.put(
  "/profile",
  generalLimiter,
  verifyToken,
  validateRequest(profileSchema),
  updateUserProfile
);
router.post(
  "/profile",
  generalLimiter,
  verifyToken,
  validateRequest(profileSchema),
  upsertUserProfile
);
router.get(
  "/profile/completion",
  generalLimiter,
  verifyToken,
  checkProfileCompletion
);
router.post(
  "/profile-picture",
  generalLimiter,
  verifyToken,
  uploadMiddleware,
  handleUploadErrors,
  uploadProfilePicture
);

export default router;
