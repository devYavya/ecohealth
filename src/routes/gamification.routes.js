// src/routes/gamification.routes.js

import express from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import {
  getGamificationProfile,
  updateGamificationAPI,
  resetGamificationProfile,
} from "../controllers/gamification.controller.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Gamification
 *   description: Eco points, levels, streaks and badge system
 */

/**
 * @swagger
 * /api/gamification/profile:
 *   get:
 *     summary: Get user's gamification profile
 *     tags: [Gamification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Gamification data fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 gamification:
 *                   type: object
 *                   properties:
 *                     ecoPoints:
 *                       type: number
 *                     level:
 *                       type: number
 *       404:
 *         description: Profile not found
 *       500:
 *         description: Internal server error
 */

router.get("/profile", verifyToken, getGamificationProfile);

/**
 * @swagger
 * /api/gamification/update:
 *   post:
 *     summary: Update user's gamification progress based on daily carbon footprint
 *     tags: [Gamification]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - carbonFootprint
 *             properties:
 *               carbonFootprint:
 *                 type: number
 *                 example: 2.5
 *     responses:
 *       200:
 *         description: Gamification updated successfully
 *       500:
 *         description: Internal server error
 */

router.post("/update", verifyToken, updateGamificationAPI);

/**
 * @swagger
 * /api/gamification/reset:
 *   post:
 *     summary: Reset gamification profile (ecoPoints, level, etc.)
 *     tags: [Gamification]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Gamification profile reset successfully
 *       500:
 *         description: Internal server error
 */

router.post("/reset", verifyToken, resetGamificationProfile);

export default router;
