import express from "express";
import {
  getTodaysTip,
  generateDailyTips,
  markTipAsRead,
  getTipHistory,
  getTodaysTipsPool,
  cleanupOldTips,
} from "../controllers/aiTips.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { verifyAdmin } from "../middlewares/admin.middleware.js";
import { validateRequest } from "../middlewares/validation.middleware.js";
import { body, param, query } from "express-validator";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     DailyTip:
 *       type: object
 *       properties:
 *         transport:
 *           type: string
 *           description: Transport-related eco tip
 *         diet:
 *           type: string
 *           description: Diet-related eco tip
 *         electricity:
 *           type: string
 *           description: Electricity-related eco tip
 *         lifestyle:
 *           type: string
 *           description: Lifestyle-related eco tip
 *
 *     UserDailyTip:
 *       type: object
 *       properties:
 *         tipId:
 *           type: string
 *           description: Unique identifier for the user's tip
 *         userId:
 *           type: string
 *           description: User ID who received the tip
 *         date:
 *           type: string
 *           description: Date for which the tip was generated (YYYY-MM-DD)
 *         tip:
 *           $ref: '#/components/schemas/DailyTip'
 *         generatedAt:
 *           type: string
 *           format: date-time
 *           description: When the tip was generated
 *         isRead:
 *           type: boolean
 *           description: Whether the tip has been read
 *         source:
 *           type: string
 *           description: Source of the tip (e.g., "Gemini Generated Daily Tips")
 *
 * /api/ai-tips/today:
 *   get:
 *     summary: Get today's random tip for user
 *     description: Gets a random tip from today's Gemini-generated pool for the authenticated user
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
 *                   $ref: '#/components/schemas/UserDailyTip'
 *       500:
 *         description: Failed to get today's tip
 */
router.get("/today", verifyToken, getTodaysTip);

/**
 * @swagger
 * /api/ai-tips/generate-daily:
 *   post:
 *     summary: Generate new daily tips using Gemini AI
 *     description: Generates 25 new tips using Gemini AI and stores them for the day (Admin only)
 *     tags: [AI Tips - Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daily tips generated successfully
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
 *                     success:
 *                       type: boolean
 *                     tipsCount:
 *                       type: integer
 *                       description: Number of tips generated
 *                     date:
 *                       type: string
 *                       description: Date for which tips were generated
 *       500:
 *         description: Failed to generate daily tips
 */
router.post("/generate-daily", verifyToken, verifyAdmin, generateDailyTips);

/**
 * @swagger
 * /api/ai-tips/{tipId}/read:
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

 /**
 * @swagger
 * /api/ai-tips/pool/today:
 *   get:
 *     summary: Get today's tips pool
 *     description: Retrieve today's complete pool of 25 generated tips (Admin only)
 *     tags: [AI Tips - Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's tips pool retrieved successfully
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
 *                     date:
 *                       type: string
 *                       description: Date of the tips pool
 *                     tips:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/DailyTip'
 *                     totalTips:
 *                       type: integer
 *                       description: Total number of tips in the pool
 *                     generatedAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: No tips pool found for today
 *       500:
 *         description: Failed to retrieve today's tips pool
 */
router.get("/pool/today", verifyToken, verifyAdmin, getTodaysTipsPool);

/**
 * @swagger
 * /api/ai-tips/cleanup:
 *   post:
 *     summary: Clean up old tips
 *     description: Remove old tips from database to maintain performance (Admin only)
 *     tags: [AI Tips - Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Old tips cleaned up successfully
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
 *                     success:
 *                       type: boolean
 *                     deletedCount:
 *                       type: integer
 *                       description: Number of old tips deleted
 *       500:
 *         description: Failed to cleanup old tips
 */
router.post("/cleanup", verifyToken, verifyAdmin, cleanupOldTips);

export default router;
