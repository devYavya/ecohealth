// src/routes/dailyLogs.routes.js

import express from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import {
  submitDailyLog,
  getDailyLog,
  getWeeklySummary,
  getAllDailyLogs,
} from "../controllers/dailyLogs.controller.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: DailyLogs
 *   description: Daily eco-health tracking APIs
 */

/**
 * @swagger
 * /api/daily-logs/submit:
 *   post:
 *     summary: Submit daily carbon activity log with specific daily questions
 *     tags: [DailyLogs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 description: Date in YYYY-MM-DD format
 *                 example: "2025-07-28"
 *               
 *               # Transport Questions
 *               totalDistanceTraveled:
 *                 type: string
 *                 enum: ["0_5km", "6_15km", "16_30km", "31_50km", "51plus_km"]
 *                 description: "Q1: How far did you travel today (total)?"
 *                 example: "16_30km"
 *               primaryTransportMode:
 *                 type: string
 *                 enum: ["car", "bike", "metro", "bus", "walking", "work_from_home"]
 *                 description: "Q2: Which mode did you mostly use today?"
 *                 example: "metro"
 *               
 *               # Diet Questions
 *               totalMealsToday:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 4
 *                 description: "Q1: How many meals did you have today? (4+ = 4)"
 *                 example: 3
 *               mealsWithMeat:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 3
 *                 description: "Q2: How many included meat/non-veg? (3+ = 3)"
 *                 example: 1
 *               ateOutsideOrOrdered:
 *                 type: boolean
 *                 description: "Q3: Did you eat outside or order food today?"
 *                 example: false
 *               
 *               # Electricity Questions
 *               acUsageHours:
 *                 type: string
 *                 enum: ["0", "less_than_2", "2_to_4", "4_plus"]
 *                 description: "Q1: How many hours did you use AC today?"
 *                 example: "2_to_4"
 *               highPowerAppliances:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: ["geyser", "microwave", "washing_machine"]
 *                 description: "Q2: Did you use high-power appliances today? (Multi-select)"
 *                 example: ["geyser", "microwave"]
 *               workedFromHome:
 *                 type: boolean
 *                 description: "Q3: Did you work/study from home today?"
 *                 example: true
 *               
 *               # Lifestyle Questions
 *               placedOnlineOrders:
 *                 type: boolean
 *                 description: "Q1: Did you place any online orders today?"
 *                 example: false
 *               screenTimeHours:
 *                 type: string
 *                 enum: ["less_than_2", "2_to_4", "4_to_6", "6_plus"]
 *                 description: "Q2: Roughly how many hours did you spend on screens today?"
 *                 example: "4_to_6"
 *               segregatedWaste:
 *                 type: boolean
 *                 description: "Q3: Did you segregate or recycle waste today?"
 *                 example: true
 *               
 *               # Optional Fitness Data
 *               steps:
 *                 type: integer
 *                 description: Daily step count
 *                 example: 8500
 *               distance:
 *                 type: number
 *                 description: Distance traveled in km (auto-calculated if not provided)
 *                 example: 6.8
 *               caloriesBurned:
 *                 type: integer
 *                 description: Calories burned during activities
 *                 example: 320
 *               aiTipId:
 *                 type: string
 *                 description: Reference to AI-generated tip
 *                 example: "tip_123_save_energy"
 *     responses:
 *       200:
 *         description: Daily log submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Daily log submitted"
 *                 carbonFootprint:
 *                   type: number
 *                   description: Total calculated carbon footprint for the day
 *                   example: 12.45
 *                 breakdown:
 *                   type: object
 *                   description: Carbon footprint breakdown by category
 *                   properties:
 *                     transport:
 *                       type: number
 *                       example: 5.2
 *                     diet:
 *                       type: number
 *                       example: 4.1
 *                     electricity:
 *                       type: number
 *                       example: 2.3
 *                     lifestyle:
 *                       type: number
 *                       example: 0.85
 *       400:
 *         description: Bad request - missing required fields or user not onboarded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Date is required"
 *                 error:
 *                   type: string
 *                   example: "User must complete onboarding before submitting daily logs"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

router.post("/submit", verifyToken, submitDailyLog);


/**
 * @swagger
 * /api/daily-logs/weekly-summary:
 *   get:
 *     summary: Get weekly summary of carbon footprint and steps
 *     tags: [DailyLogs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Weekly summary returned
 *       500:
 *         description: Internal server error
 */
router.get("/weekly-summary", verifyToken, getWeeklySummary);

/**
 * @swagger
 * /api/daily-logs/{date}:
 *   get:
 *     summary: Get daily log for a specific date
 *     tags: [DailyLogs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: date
 *         required: true
 *         schema:
 *           type: string
 *         description: Date in YYYY-MM-DD format
 *     responses:
 *       200:
 *         description: Daily log data for the given date
 *       404:
 *         description: Log not found
 */
router.get("/:date", verifyToken, getDailyLog);

// Endpoint to get all daily logs 
router.get("/debug/all", verifyToken, getAllDailyLogs);

export default router;
