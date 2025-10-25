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
 *     summary: Submit daily carbon activity log (Independent calculation)
 *     description: Submit daily eco-activities for carbon footprint calculation. This endpoint works independently and does not require onboarding completion. Carbon footprint is calculated based solely on daily activities provided.
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
 *                 example: "2025-08-05"
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
 *               aiTipId:
 *                 type: string
 *                 description: Reference to AI-generated tip
 *                 example: "tip_123_save_energy"
 *     responses:
 *       200:
 *         description: Daily log submitted successfully with calculated carbon footprint breakdown and user profile
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
 *                   description: Total calculated carbon footprint for the day (kg CO2e)
 *                   example: 23.75
 *                 breakdown:
 *                   type: object
 *                   description: Carbon footprint breakdown by category (kg CO2e)
 *                   properties:
 *                     transport:
 *                       type: number
 *                       example: 8.5
 *                     diet:
 *                       type: number
 *                       example: 7.2
 *                     electricity:
 *                       type: number
 *                       example: 5.4
 *                     lifestyle:
 *                       type: number
 *                       example: 2.65
 *                 profile:
 *                   type: object
 *                   description: User's onboarding profile data (if available)
 *                   properties:
 *                     transport:
 *                       type: object
 *                       description: User's transport preferences
 *                       example: { "primaryMode": "metro_train", "dailyDistance": "16_30km" }
 *                     diet:
 *                       type: object
 *                       description: User's diet preferences
 *                       example: { "meatPercentage": 30, "mealsPerDay": 3 }
 *                     electricity:
 *                       type: object
 *                       description: User's electricity usage patterns
 *                       example: { "timeAtHome": "9_12_hours", "appliances": ["geyser", "microwave"] }
 *                     lifestyle:
 *                       type: object
 *                       description: User's lifestyle preferences
 *                       example: { "screenTime": "4_to_6", "wasteManagement": "basic_segregation" }
 *                     email:
 *                       type: string
 *                       example: "user@example.com"
 *                     profilePictureUrl:
 *                       type: string
 *                       example: "https://firebase.storage.url/profile.jpg"
 *                     phoneNumber:
 *                       type: string
 *                       example: "+91XXXXXXXXXX"
 *                     dateOfBirth:
 *                       type: string
 *                       example: "1995-06-15"
 *                     gender:
 *                       type: string
 *                       example: "male"
 *                     location:
 *                       type: string
 *                       example: "Mumbai, India"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-07-01T10:30:00Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-08-05T12:45:00Z"
 *                 dailyLogData:
 *                   type: object
 *                   description: Summary of submitted daily log data
 *                   properties:
 *                     date:
 *                       type: string
 *                       example: "2025-08-05"
 *                     calculatedDailyCarbonFootprint:
 *                       type: number
 *                       example: 23.75
 *                     activities:
 *                       type: object
 *                       description: Processed daily activities data
 *             example:
 *               message: "Daily log submitted"
 *               carbonFootprint: 23.75
 *               breakdown:
 *                 transport: 8.5
 *                 diet: 7.2
 *                 electricity: 5.4
 *                 lifestyle: 2.65
 *               profile:
 *                 transport:
 *                   primaryMode: "metro_train"
 *                   dailyDistance: "16_30km"
 *                 diet:
 *                   meatPercentage: 30
 *                   mealsPerDay: 3
 *                 electricity:
 *                   timeAtHome: "9_12_hours"
 *                   appliances: ["geyser", "microwave"]
 *                 lifestyle:
 *                   screenTime: "4_to_6"
 *                   wasteManagement: "basic_segregation"
 *                   diet:
 *                     mealsToday: 3
 *                     meatMeals: 1
 *                     ateOutside: false
 *                   electricity:
 *                     acHours: "2_4"
 *                     appliances: ["geyser", "microwave"]
 *                   lifestyle:
 *                     screenTime: "4_to_6"
 *                     onlineOrders: false
 *                     wasteSegregation: true
 *       400:
 *         description: Bad request - missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Date is required"
 *       401:
 *         description: Unauthorized - invalid or missing token
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
