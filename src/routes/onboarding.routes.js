// src/routes/onboarding.routes.js

import express from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import {
  getOnboardingQuestions,
  getOnboardingProgress,
  submitOnboarding,
  getDashboardData,
} from "../controllers/onboarding.controller.js";

const router = express.Router();

/**
 * @swagger
 * /api/onboarding/questions:
 *   get:
 *     summary: Get all 15 onboarding questions
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding questions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 questions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                         example: 1
 *                       question:
 *                         type: string
 *                         example: "What is your primary mode of transportation?"
 *                       field:
 *                         type: string
 *                         example: "primaryTransport"
 *                       type:
 *                         type: string
 *                         example: "single_choice"
 *                       options:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             value:
 *                               type: string
 *                               example: "car_daily"
 *                             label:
 *                               type: string
 *                               example: "Personal Car (Daily)"
 *                             icon:
 *                               type: string
 *                               example: "🚗"
 *                 totalQuestions:
 *                   type: number
 *                   example: 15
 *                 message:
 *                   type: string
 *                   example: "Onboarding questions retrieved successfully"
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/questions", verifyToken, getOnboardingQuestions);

/**
 * @swagger
 * /api/onboarding/progress:
 *   get:
 *     summary: Get onboarding progress for current user
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding progress retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isCompleted:
 *                   type: boolean
 *                   example: false
 *                 progress:
 *                   type: number
 *                   example: 60
 *                 totalQuestions:
 *                   type: number
 *                   example: 15
 *                 completedQuestions:
 *                   type: number
 *                   example: 9
 *                 nextQuestion:
 *                   type: number
 *                   example: 10
 *                 completedFields:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["primaryTransport", "dietType", "homeSize"]
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get("/progress", verifyToken, getOnboardingProgress);

/**
 * @swagger
 * /api/onboarding/submit:
 *   post:
 *     summary: Submit complete 15-question onboarding answers
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - primaryTransport
 *               - commuteDistance
 *               - dietType
 *               - homeSize
 *               - acUsage
 *               - digitalUsage
 *               - shoppingFrequency
 *               - waterUsage
 *               - wasteManagement
 *               - foodWaste
 *               - airTravel
 *               - energySource
 *               - clothingPurchases
 *               - fitnessActivities
 *               - applianceUsage
 *             properties:
 *               primaryTransport:
 *                 type: string
 *                 enum: [car_daily, public_transport, bike_scooter, walking, electric_vehicle, work_from_home]
 *                 example: "public_transport"
 *               commuteDistance:
 *                 type: string
 *                 enum: [less_than_5km, five_to_15km, fifteen_to_30km, more_than_30km]
 *                 example: "five_to_15km"
 *               dietType:
 *                 type: string
 *                 enum: [vegan, vegetarian, pescatarian, occasional_meat, regular_meat, heavy_meat]
 *                 example: "vegetarian"
 *               homeSize:
 *                 type: string
 *                 enum: [studio_1bhk, two_bhk, three_bhk, four_plus_bhk, independent_house]
 *                 example: "two_bhk"
 *               acUsage:
 *                 type: string
 *                 enum: [no_ac, less_than_2hrs, two_to_4hrs, four_to_6hrs, six_to_8hrs, more_than_8hrs]
 *                 example: "four_to_6hrs"
 *               digitalUsage:
 *                 type: string
 *                 enum: [less_than_2hrs, two_to_4hrs, four_to_6hrs, six_to_8hrs, eight_to_10hrs, more_than_10hrs]
 *                 example: "six_to_8hrs"
 *               shoppingFrequency:
 *                 type: string
 *                 enum: [minimal_necessary, monthly_planned, weekly_regular, frequent_impulse, daily_shopping]
 *                 example: "monthly_planned"
 *               waterUsage:
 *                 type: string
 *                 enum: [very_conscious, moderately_conscious, average_usage, above_average, high_usage]
 *                 example: "moderately_conscious"
 *               wasteManagement:
 *                 type: string
 *                 enum: [comprehensive_recycling, basic_segregation, minimal_effort, no_segregation]
 *                 example: "basic_segregation"
 *               foodWaste:
 *                 type: string
 *                 enum: [zero_waste, minimal_waste, occasional_waste, regular_waste, significant_waste]
 *                 example: "minimal_waste"
 *               airTravel:
 *                 type: string
 *                 enum: [never, once_yearly, twice_yearly, quarterly, monthly, frequent_flyer]
 *                 example: "once_yearly"
 *               energySource:
 *                 type: string
 *                 enum: [renewable_solar, mix_renewable, grid_efficient, standard_grid, coal_heavy]
 *                 example: "standard_grid"
 *               clothingPurchases:
 *                 type: string
 *                 enum: [minimal_sustainable, need_based, seasonal_shopping, regular_fashion, frequent_fashion]
 *                 example: "need_based"
 *               fitnessActivities:
 *                 type: string
 *                 enum: [outdoor_natural, home_workouts, local_gym_walk, gym_commute, fitness_travel]
 *                 example: "outdoor_natural"
 *               applianceUsage:
 *                 type: string
 *                 enum: [energy_efficient_minimal, efficient_moderate, standard_usage, high_usage, excessive_usage]
 *                 example: "efficient_moderate"
 *     responses:
 *       200:
 *         description: Onboarding completed successfully with carbon footprint calculated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Onboarding completed successfully!"
 *                 carbonData:
 *                   type: object
 *                   properties:
 *                     totalCarbonFootprint:
 *                       type: number
 *                       example: 15.8
 *                     unit:
 *                       type: string
 *                       example: "kg CO2e per day"
 *                     category:
 *                       type: string
 *                       example: "Moderate Impact"
 *                     breakdown:
 *                       type: object
 *                       example:
 *                         primaryTransport:
 *                           value: "public_transport"
 *                           emission: 2.3
 *                           percentage: "14.6"
 *                 gamificationBonus:
 *                   type: number
 *                   example: 50
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       category:
 *                         type: string
 *                         example: "Transportation"
 *                       suggestion:
 *                         type: string
 *                         example: "Consider cycling for short distances"
 *                       potentialSaving:
 *                         type: string
 *                         example: "1-2 kg CO2e per day"
 *       400:
 *         description: Invalid or incomplete onboarding data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Incomplete onboarding data"
 *                 missingFields:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["primaryTransport", "dietType"]
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/onboarding/dashboard:
 *   get:
 *     summary: Get dashboard carbon footprint data
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's onboarding and carbon data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               example:
 *                 onboardingAnswers:
 *                   transportMode: "bike"
 *                   dietType: "vegetarian"
 *                   electricityUsage: "4-6_hours_ac"
 *                   digitalHours: "8+_hours"
 *                 carbonFootprint: 8.25
 */
router.post("/submit", verifyToken, submitOnboarding);
router.get("/dashboard", verifyToken, getDashboardData);

// TEST ENDPOINT - Remove in production
router.post("/test-submit", async (req, res) => {
  try {
    // Mock user for testing
    req.user = { uid: "test-user-123" };
    await submitOnboarding(req, res);
  } catch (error) {
    res.status(500).json({
      error: "Test endpoint error",
      details: error.message,
    });
  }
});

export default router;
