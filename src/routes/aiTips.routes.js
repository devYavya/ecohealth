import express from "express";
import {
  generateTip,
  getTodaysTip,
  provideFeedback,
  getTipHistory,
  getTipAnalytics,
  markTipAsRead,
} from "../controllers/aiTips.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";
import { body, param, query } from "express-validator";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     AITip:
 *       type: object
 *       properties:
 *         tipId:
 *           type: string
 *           description: Unique identifier for the tip
 *         tip:
 *           type: object
 *           properties:
 *             title:
 *               type: string
 *               description: Short, catchy tip title
 *             message:
 *               type: string
 *               description: Main tip content, actionable and specific
 *             category:
 *               type: string
 *               enum: [transport, diet, electricity, lifestyle, general]
 *               description: Category of the eco-tip
 *             impact:
 *               type: string
 *               enum: [Low, Medium, High]
 *               description: Environmental impact level
 *             estimatedCO2Reduction:
 *               type: string
 *               description: Estimated CO2 reduction amount
 *             actionSteps:
 *               type: array
 *               items:
 *                 type: string
 *               description: Specific steps to implement the tip
 *             whyItMatters:
 *               type: string
 *               description: Brief explanation of environmental impact
 *             difficulty:
 *               type: string
 *               enum: [Easy, Medium, Hard]
 *               description: Implementation difficulty
 *             timeRequired:
 *               type: string
 *               description: Time needed to implement
 *             personalizedReason:
 *               type: string
 *               description: Why this tip is specifically relevant to this user
 *         userId:
 *           type: string
 *           description: User ID who received the tip
 *         generatedAt:
 *           type: string
 *           format: date-time
 *           description: When the tip was generated
 *         isRead:
 *           type: boolean
 *           description: Whether the tip has been read
 *         feedback:
 *           type: object
 *           properties:
 *             rating:
 *               type: integer
 *               minimum: 1
 *               maximum: 5
 *               description: User rating (1-5 stars)
 *             helpful:
 *               type: boolean
 *               description: Whether the tip was helpful
 *             comment:
 *               type: string
 *               description: Optional user comment
 *             submittedAt:
 *               type: string
 *               format: date-time
 *               description: When feedback was submitted
 *         basedOnData:
 *           type: object
 *           properties:
 *             onboardingDate:
 *               type: string
 *               format: date-time
 *               description: When user completed onboarding
 *             dailyLogsCount:
 *               type: integer
 *               description: Number of daily logs analyzed
 *             analysisDate:
 *               type: string
 *               format: date-time
 *               description: When analysis was performed
 *
 *     TipFeedback:
 *       type: object
 *       properties:
 *         rating:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           description: Rating from 1-5 stars
 *         helpful:
 *           type: boolean
 *           description: Whether the tip was helpful
 *         comment:
 *           type: string
 *           maxLength: 500
 *           description: Optional feedback comment
 *
 * /api/ai-tip/generate:
 *   post:
 *     summary: Generate new personalized eco-health tip
 *     description: Creates a new AI-generated tip using user's onboarding data and past 7 days of daily logs
 *     tags: [AI Tips]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Personalized tip generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     tip:
 *                       $ref: '#/components/schemas/AITip/properties/tip'
 *                     tipId:
 *                       type: string
 *                     basedOnData:
 *                       $ref: '#/components/schemas/AITip/properties/basedOnData'
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: User onboarding data not found
 *       500:
 *         description: Failed to generate personalized tip
 */
router.post("/generate", verifyToken, generateTip);

/**
 * @swagger
 * /api/ai-tip/today:
 *   get:
 *     summary: Get today's tip
 *     description: Retrieves today's cached tip or generates a new one if none exists
 *     tags: [AI Tips]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's tip retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     tip:
 *                       $ref: '#/components/schemas/AITip/properties/tip'
 *                     tipId:
 *                       type: string
 *                     isNew:
 *                       type: boolean
 *                       description: Whether this is a newly generated tip
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *                     basedOnData:
 *                       $ref: '#/components/schemas/AITip/properties/basedOnData'
 *       404:
 *         description: User onboarding data not found
 *       500:
 *         description: Failed to get today's tip
 */
router.get("/today", verifyToken, getTodaysTip);

/**
 * @swagger
 * /api/ai-tip/{tipId}/feedback:
 *   post:
 *     summary: Provide feedback on a tip
 *     description: Submit rating, helpfulness, and optional comment for a tip
 *     tags: [AI Tips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tipId
 *         required: true
 *         schema:
 *           type: string
 *         description: The tip ID to provide feedback for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TipFeedback'
 *           example:
 *             rating: 5
 *             helpful: true
 *             comment: "This tip helped me save 20% on my electricity bill!"
 *     responses:
 *       200:
 *         description: Feedback recorded successfully
 *       400:
 *         description: Invalid feedback data
 *       403:
 *         description: Unauthorized to provide feedback on this tip
 *       404:
 *         description: Tip not found
 *       500:
 *         description: Failed to record feedback
 */
router.post(
  "/:tipId/feedback",
  verifyToken,
  [
    param("tipId").notEmpty().withMessage("Tip ID is required"),
    body("rating")
      .optional()
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    body("helpful")
      .optional()
      .isBoolean()
      .withMessage("Helpful must be a boolean"),
    body("comment")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Comment must be maximum 500 characters"),
  ],
  validateRequest,
  provideFeedback
);

/**
 * @swagger
 * /api/ai-tip/history:
 *   get:
 *     summary: Get user's tip history
 *     description: Retrieve user's past tips with optional filtering
 *     tags: [AI Tips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 50
 *         description: Number of tips to return
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [transport, diet, electricity, lifestyle, general]
 *         description: Filter by tip category
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *           minimum: 1
 *           maximum: 365
 *         description: Number of days to look back
 *     responses:
 *       200:
 *         description: Tip history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     tips:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/AITip'
 *                     totalCount:
 *                       type: integer
 *                     filters:
 *                       type: object
 *       500:
 *         description: Failed to retrieve tip history
 */
router.get(
  "/history",
  verifyToken,
  [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be between 1 and 50"),
    query("category")
      .optional()
      .isIn(["transport", "diet", "electricity", "lifestyle", "general"])
      .withMessage("Invalid category"),
    query("days")
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage("Days must be between 1 and 365"),
  ],
  validateRequest,
  getTipHistory
);

/**
 * @swagger
 * /api/ai-tip/analytics:
 *   get:
 *     summary: Get tip engagement analytics
 *     description: Retrieve user's tip engagement metrics and statistics
 *     tags: [AI Tips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *           minimum: 1
 *           maximum: 365
 *         description: Number of days to analyze
 *     responses:
 *       200:
 *         description: Tip analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalTips:
 *                       type: integer
 *                       description: Total number of tips received
 *                     tipsWithFeedback:
 *                       type: integer
 *                       description: Number of tips that received feedback
 *                     averageRating:
 *                       type: number
 *                       description: Average rating across all rated tips
 *                     helpfulTips:
 *                       type: integer
 *                       description: Number of tips marked as helpful
 *                     categoryBreakdown:
 *                       type: object
 *                       description: Count of tips by category
 *                     impactBreakdown:
 *                       type: object
 *                       description: Count of tips by impact level
 *                     readTips:
 *                       type: integer
 *                       description: Number of tips that were read
 *                     dateRange:
 *                       type: object
 *                       properties:
 *                         start:
 *                           type: string
 *                           format: date-time
 *                         end:
 *                           type: string
 *                           format: date-time
 *       500:
 *         description: Failed to retrieve tip analytics
 */
router.get(
  "/analytics",
  verifyToken,
  [
    query("days")
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage("Days must be between 1 and 365"),
  ],
  validateRequest,
  getTipAnalytics
);

/**
 * @swagger
 * /api/ai-tip/{tipId}/read:
 *   patch:
 *     summary: Mark tip as read
 *     description: Mark a specific tip as read by the user
 *     tags: [AI Tips]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tipId
 *         required: true
 *         schema:
 *           type: string
 *         description: The tip ID to mark as read
 *     responses:
 *       200:
 *         description: Tip marked as read successfully
 *       403:
 *         description: Unauthorized to mark this tip as read
 *       404:
 *         description: Tip not found
 *       500:
 *         description: Failed to mark tip as read
 */
router.patch(
  "/:tipId/read",
  verifyToken,
  [param("tipId").notEmpty().withMessage("Tip ID is required")],
  validateRequest,
  markTipAsRead
);

export default router;
