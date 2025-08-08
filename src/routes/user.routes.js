import express from "express";
const router = express.Router();
import {
  getUserProfile,
  updateUserProfile,
  upsertUserProfile,
  checkProfileCompletion,
  getReferralInfo,
  validateReferralCode,
  resetProgress,
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

/**
 * @swagger
 * /api/user/referral/info:
 *   get:
 *     summary: Get user's referral information and statistics
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Referral information retrieved successfully
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
 *                   example: "Referral information retrieved"
 *                 data:
 *                   type: object
 *                   properties:
 *                     myReferralCode:
 *                       type: string
 *                       example: "JOHNDOE1234"
 *                     totalReferrals:
 *                       type: number
 *                       example: 5
 *                     referralBonusEarned:
 *                       type: number
 *                       example: 210
 *                       description: Points earned from referring others (70 per referral)
 *                     welcomeBonusReceived:
 *                       type: number
 *                       example: 70
 *                       description: Points received for being referred by someone
 *                     totalReferralEarnings:
 *                       type: number
 *                       example: 280
 *                       description: Combined total of all referral-related points
 *                     referredUsers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           email:
 *                             type: string
 *                           joinedAt:
 *                             type: string
 *                             format: date-time
 *                     referredBy:
 *                       type: string
 *                       nullable: true
 *                       example: "JANEDOE5678"
 *                     shareMessage:
 *                       type: string
 *                       example: "Join EcoHealth and start your sustainable journey! Use my referral code: JOHNDOE1234 and we both get 70 eco points!"
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/user/referral/validate/{referralCode}:
 *   get:
 *     summary: Validate a referral code
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: referralCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Referral code to validate
 *         example: "JOHNDOE1234"
 *     responses:
 *       200:
 *         description: Referral code validation result
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
 *                   example: "Valid referral code"
 *                 data:
 *                   type: object
 *                   properties:
 *                     isValid:
 *                       type: boolean
 *                       example: true
 *                     referrerName:
 *                       type: string
 *                       example: "John Doe"
 *                     referrerEmail:
 *                       type: string
 *                       example: "john@example.com"
 *                     bonus:
 *                       type: string
 *                       example: "You and your friend will both get 70 eco points!"
 *       404:
 *         description: Invalid referral code
 *       500:
 *         description: Internal server error
 */

/**
 * @swagger
 * /api/user/reset-progress:
 *   post:
 *     summary: Reset user progress (keeps profile and onboarding data)
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Progress reset successfully
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
 *                   example: "Progress reset successfully! Your profile and onboarding data have been preserved."
 *                 data:
 *                   type: object
 *                   properties:
 *                     resetAt:
 *                       type: string
 *                       format: date-time
 *                     preservedData:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Profile information", "Onboarding responses", "Referral code and history"]
 *                     clearedData:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Daily logs", "Eco points and badges", "Challenge progress", "AI tips history", "Social feed posts"]
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
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

// Referral routes
router.get("/referral/info", generalLimiter, verifyToken, getReferralInfo);
router.get("/referral/validate/:referralCode", validateReferralCode);

// Reset progress route
router.post("/reset-progress", generalLimiter, verifyToken, resetProgress);

export default router;
