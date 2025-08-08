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
 * components:
 *   schemas:
 *     OnboardingProfile:
 *       type: object
 *       required:
 *         - primaryMode
 *         - fuelType
 *         - dailyDistance
 *         - passengers
 *         - flightsPerYear
 *         - mileage
 *         - mealsPerDay
 *         - meatPercentage
 *         - dairyPercentage
 *         - plantPercentage
 *         - orderedMealsFreq
 *         - junkFoodFreq
 *         - foodWaste
 *         - monthlyKwh
 *         - householdSize
 *         - timeAtHome
 *         - appliances
 *         - renewableEnergy
 *         - screenTime
 *         - nonEssentialShopping
 *         - fashionShopping
 *         - onlineOrders
 *         - wasteManagement
 *       properties:
 *         # Transport Profile
 *         primaryMode:
 *           type: string
 *           enum: [personal_car, two_wheeler, bus, metro_train, bicycle, walking, work_from_home]
 *           description: Primary mode of daily commute
 *         fuelType:
 *           type: string
 *           enum: [petrol, diesel, cng, electric, hybrid]
 *           description: Vehicle fuel type (if applicable)
 *         dailyDistance:
 *           type: string
 *           enum: [0_5km, 6_15km, 16_30km, 31_50km, 51plus_km]
 *           description: Daily travel distance
 *         passengers:
 *           type: string
 *           enum: [alone, with_1, with_2_3, with_4plus]
 *           description: Typical number of passengers in vehicle
 *         flightsPerYear:
 *           type: string
 *           enum: [none, 1_2, 3_5, 6plus]
 *           description: Number of flights taken per year
 *         mileage:
 *           type: string
 *           enum: [high, medium, low]
 *           description: Vehicle fuel efficiency
 *
 *         # Diet Profile
 *         mealsPerDay:
 *           type: integer
 *           minimum: 1
 *           maximum: 6
 *           description: Number of meals consumed per day
 *         meatPercentage:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           description: Percentage of meals containing meat
 *         dairyPercentage:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           description: Percentage of meals containing dairy
 *         plantPercentage:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           description: Percentage of plant-based meals
 *         orderedMealsFreq:
 *           type: string
 *           enum: [never, 1_5_week, 6_10_week, 11_15_week, 16_20_week, 21plus_week]
 *           description: Frequency of ordered/delivered meals per week
 *         junkFoodFreq:
 *           type: string
 *           enum: [never, rarely, weekly, few_times_week, daily]
 *           description: Frequency of junk food consumption
 *         foodWaste:
 *           type: string
 *           enum: [never, rarely, sometimes, often, always]
 *           description: Food waste frequency
 *
 *         # Electricity Profile
 *         monthlyKwh:
 *           type: integer
 *           minimum: 0
 *           maximum: 2000
 *           description: Monthly electricity consumption in kWh
 *         householdSize:
 *           type: integer
 *           minimum: 1
 *           maximum: 10
 *           description: Number of people in household
 *         timeAtHome:
 *           type: string
 *           enum: [less_4hours, 4_8hours, 8_12hours, 12plus_hours]
 *           description: Time spent at home daily
 *         appliances:
 *           type: array
 *           items:
 *             type: string
 *             enum: [air_conditioner, geyser, refrigerator, washing_machine, microwave, laptop_desktop, tv_console, dishwasher, electric_vehicle_charger]
 *           description: List of electrical appliances owned
 *         renewableEnergy:
 *           type: string
 *           enum: [solar_panels, wind_power, renewable_grid, no_renewable]
 *           description: Renewable energy usage
 *
 *         # Lifestyle Profile
 *         screenTime:
 *           type: string
 *           enum: [less_2hrs, 2_4hrs, 4_6hrs, 6plus_hrs]
 *           description: Daily screen time hours
 *         nonEssentialShopping:
 *           type: string
 *           enum: [never, monthly, weekly, few_times_week, daily]
 *           description: Frequency of non-essential shopping
 *         fashionShopping:
 *           type: string
 *           enum: [never, few_times_year, once_month, more_once_month, weekly]
 *           description: Fashion/clothing shopping frequency
 *         onlineOrders:
 *           type: string
 *           enum: [0_2, 3_5, 6_10, 11_15, 15plus]
 *           description: Number of online orders per month
 *         wasteManagement:
 *           type: string
 *           enum: [segregate_recycle, basic_segregation, minimal_effort, throw_everything]
 *           description: Waste management practices
 *
 *     CarbonFootprintData:
 *       type: object
 *       properties:
 *         totalCarbonFootprint:
 *           type: number
 *           format: float
 *           description: Total daily carbon footprint in kg CO2e
 *         unit:
 *           type: string
 *           example: "kg CO2e per day"
 *         category:
 *           type: string
 *           enum: [Low Impact, Moderate Impact, High Impact, Very High Impact]
 *           description: Carbon footprint impact category
 *         breakdown:
 *           type: object
 *           properties:
 *             transport:
 *               $ref: '#/components/schemas/CarbonBreakdownItem'
 *             diet:
 *               $ref: '#/components/schemas/CarbonBreakdownItem'
 *             electricity:
 *               $ref: '#/components/schemas/CarbonBreakdownItem'
 *             lifestyle:
 *               $ref: '#/components/schemas/CarbonBreakdownItem'
 *
 *     CarbonBreakdownItem:
 *       type: object
 *       properties:
 *         value:
 *           type: string
 *           description: The specific value or category for this component
 *         emission:
 *           type: number
 *           format: float
 *           description: Carbon emissions for this component in kg CO2e
 *         percentage:
 *           type: string
 *           description: Percentage contribution to total footprint
 *
 *     OnboardingResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Success message
 *         carbonData:
 *           $ref: '#/components/schemas/CarbonFootprintData'
 *         gamificationBonus:
 *           type: number
 *           description: Points awarded for completing onboarding
 *         recommendations:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Recommendation'
 *           description: Personalized carbon reduction recommendations
 *
 *     Recommendation:
 *       type: object
 *       properties:
 *         category:
 *           type: string
 *           description: Category of the recommendation
 *         suggestion:
 *           type: string
 *           description: The recommended action
 *         potentialSaving:
 *           type: string
 *           description: Estimated carbon savings from implementing this recommendation
 */

/**
 * @swagger
 * /api/onboarding/questions:
 *   get:
 *     summary: Get all 25 onboarding questions
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
 *     summary: Submit complete onboarding profile with carbon footprint calculation
 *     description: Submit comprehensive user profile including transport, diet, electricity, and lifestyle data for carbon footprint calculation
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
 *               - primaryMode
 *               - fuelType
 *               - dailyDistance
 *               - passengers
 *               - flightsPerYear
 *               - mileage
 *               - mealsPerDay
 *               - meatPercentage
 *               - dairyPercentage
 *               - plantPercentage
 *               - orderedMealsFreq
 *               - junkFoodFreq
 *               - foodWaste
 *               - monthlyKwh
 *               - householdSize
 *               - timeAtHome
 *               - appliances
 *               - renewableEnergy
 *               - screenTime
 *               - nonEssentialShopping
 *               - fashionShopping
 *               - onlineOrders
 *               - wasteManagement
 *             properties:
 *               # Transport Profile
 *               primaryMode:
 *                 type: string
 *                 enum: [personal_car, two_wheeler, bus, metro_train, bicycle, walking, work_from_home]
 *                 example: "personal_car"
 *                 description: Primary mode of daily commute
 *               fuelType:
 *                 type: string
 *                 enum: [petrol, diesel, cng, electric, hybrid]
 *                 example: "electric"
 *                 description: Vehicle fuel type (if applicable)
 *               evChargingSource:
 *                 type: string
 *                 enum: [renewable, grid, mixed]
 *                 example: "renewable"
 *                 description: EV charging source (required if fuelType is electric)
 *               dailyDistance:
 *                 type: string
 *                 enum: [0_5km, 6_15km, 16_30km, 31_50km, 51plus_km]
 *                 example: "6_15km"
 *                 description: Daily travel distance
 *               passengers:
 *                 type: string
 *                 enum: [alone, one_passenger, two_passengers, three_plus_passengers]
 *                 example: "one_passenger"
 *                 description: Typical number of passengers in vehicle
 *               flightsPerYear:
 *                 type: string
 *                 enum: [none, 1_2, 3_5, 6_10, 11plus]
 *                 example: "1_2"
 *                 description: Number of flights taken per year
 *               mileage:
 *                 type: string
 *                 enum: [excellent, good, average, poor]
 *                 example: "excellent"
 *                 description: Vehicle fuel efficiency
 *               
 *               # Diet Profile
 *               mealsPerDay:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 6
 *                 example: 3
 *                 description: Number of meals consumed per day
 *               meatPercentage:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 10
 *                 description: Percentage of meals containing meat
 *               dairyPercentage:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 20
 *                 description: Percentage of meals containing dairy
 *               plantPercentage:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 70
 *                 description: Percentage of plant-based meals
 *               orderedMealsFreq:
 *                 type: string
 *                 enum: [never, 1_2_week, 3_5_week, 6_10_week, 11_15_week, 16plus_week]
 *                 example: "1_2_week"
 *                 description: Frequency of ordered/delivered meals per week
 *               junkFoodFreq:
 *                 type: string
 *                 enum: [never, rarely, occasionally, frequently, daily]
 *                 example: "occasionally"
 *                 description: Frequency of junk food consumption
 *               foodWaste:
 *                 type: string
 *                 enum: [never, rarely, sometimes, often, always]
 *                 example: "rarely"
 *                 description: Food waste frequency
 *               
 *               # Electricity Profile
 *               monthlyKwh:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 2000
 *                 example: 200
 *                 description: Monthly electricity consumption in kWh
 *               householdSize:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *                 example: 3
 *                 description: Number of people in household
 *               timeAtHome:
 *                 type: string
 *                 enum: [less_4_hours, 5_8_hours, 9_12_hours, 13plus_hours]
 *                 example: "5_8_hours"
 *                 description: Time spent at home daily
 *               appliances:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [air_conditioner, geyser, refrigerator, washing_machine, microwave, laptop_desktop, tv_console, dishwasher, electric_vehicle_charger]
 *                 example: ["refrigerator", "washing_machine", "laptop_desktop"]
 *                 description: List of electrical appliances owned
 *               renewableEnergy:
 *                 type: string
 *                 enum: [solar_panels, partially_renewable, renewable_grid, no_renewable]
 *                 example: "partially_renewable"
 *                 description: Renewable energy usage
 *               
 *               # Lifestyle Profile
 *               screenTime:
 *                 type: string
 *                 enum: [less_2hrs, 2_4hrs, 4_6hrs, 6_8hrs, 8plus_hrs]
 *                 example: "2_4hrs"
 *                 description: Daily screen time hours
 *               nonEssentialShopping:
 *                 type: string
 *                 enum: [never, few_times_month, weekly, few_times_week, daily]
 *                 example: "few_times_month"
 *                 description: Frequency of non-essential shopping
 *               fashionShopping:
 *                 type: string
 *                 enum: [never, every_6plus_months, every_3plus_months, monthly, every_2_weeks]
 *                 example: "every_3plus_months"
 *                 description: Fashion/clothing shopping frequency
 *               onlineOrders:
 *                 type: string
 *                 enum: [0, 1_5, 6_10, 11_20, 21plus]
 *                 example: "1_5"
 *                 description: Number of online orders per month
 *               wasteManagement:
 *                 type: string
 *                 enum: [separate_all, recycle_some, basic_separation, throw_together]
 *                 example: "recycle_some"
 *                 description: Waste management practices
 *           example:
 *             primaryMode: "personal_car"
 *             fuelType: "electric"
 *             evChargingSource: "renewable"
 *             dailyDistance: "6_15km"
 *             passengers: "one_passenger"
 *             flightsPerYear: "1_2"
 *             mileage: "excellent"
 *             mealsPerDay: 3
 *             meatPercentage: 10
 *             dairyPercentage: 20
 *             plantPercentage: 70
 *             orderedMealsFreq: "1_2_week"
 *             junkFoodFreq: "occasionally"
 *             foodWaste: "rarely"
 *             monthlyKwh: 200
 *             householdSize: 3
 *             timeAtHome: "5_8_hours"
 *             appliances: ["refrigerator", "washing_machine", "laptop_desktop"]
 *             renewableEnergy: "partially_renewable"
 *             screenTime: "2_4hrs"
 *             nonEssentialShopping: "few_times_month"
 *             fashionShopping: "every_3plus_months"
 *             onlineOrders: "1_5"
 *             wasteManagement: "recycle_some"
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
 *                       format: float
 *                       example: 8.45
 *                       description: Total daily carbon footprint in kg CO2e
 *                     unit:
 *                       type: string
 *                       example: "kg CO2e per day"
 *                     category:
 *                       type: string
 *                       enum: [Low Impact, Moderate Impact, High Impact, Very High Impact]
 *                       example: "Low Impact"
 *                       description: Carbon footprint impact category
 *                     breakdown:
 *                       type: object
 *                       properties:
 *                         transport:
 *                           type: object
 *                           properties:
 *                             value:
 *                               type: string
 *                               example: "electric_vehicle"
 *                             emission:
 *                               type: number
 *                               example: 2.15
 *                             percentage:
 *                               type: string
 *                               example: "25.4%"
 *                         diet:
 *                           type: object
 *                           properties:
 *                             value:
 *                               type: string
 *                               example: "plant_based"
 *                             emission:
 *                               type: number
 *                               example: 3.20
 *                             percentage:
 *                               type: string
 *                               example: "37.9%"
 *                         electricity:
 *                           type: object
 *                           properties:
 *                             value:
 *                               type: string
 *                               example: "renewable_energy"
 *                             emission:
 *                               type: number
 *                               example: 1.85
 *                             percentage:
 *                               type: string
 *                               example: "21.9%"
 *                         lifestyle:
 *                           type: object
 *                           properties:
 *                             value:
 *                               type: string
 *                               example: "minimal_consumption"
 *                             emission:
 *                               type: number
 *                               example: 1.25
 *                             percentage:
 *                               type: string
 *                               example: "14.8%"
 *                 gamificationBonus:
 *                   type: number
 *                   example: 50
 *                   description: Points awarded for completing onboarding
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
 *                         example: "Continue using renewable energy for EV charging"
 *                       potentialSaving:
 *                         type: string
 *                         example: "0.5-1 kg CO2e per day"
 *                   description: Personalized carbon reduction recommendations
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
 *                 details:
 *                   type: string
 *                   example: "Missing required fields for carbon calculation"
 *                 missingFields:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["primaryMode", "mealsPerDay", "monthlyKwh"]
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       500:
 *         description: Server error - Failed to process onboarding data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to save onboarding data."
 *                 details:
 *                   type: string
 *                   example: "Database connection error"
 */
/**
 * @swagger
 * /api/onboarding/dashboard:
 *   get:
 *     summary: Get comprehensive dashboard data including updated eco points
 *     description: Retrieves user dashboard data including eco points from challenges, daily logs, and detailed gamification statistics
 *     tags: [Onboarding]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Dashboard data retrieved successfully"
 *                 dashboardData:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                       description: User's display name
 *                     profilePictureUrl:
 *                       type: string
 *                       nullable: true
 *                       example: "https://example.com/profile.jpg"
 *                       description: URL to user's profile picture
 *                     ecoPoints:
 *                       type: number
 *                       example: 125
 *                       description: Total eco points accumulated by user
 *                     level:
 *                       type: number
 *                       example: 2
 *                       description: Current user level based on eco points
 *                     badges:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Energy Saver", "Green Commuter"]
 *                       description: List of badges earned by user
 *                     baselineCarbonFootprint:
 *                       type: object
 *                       nullable: true
 *                       properties:
 *                         totalCarbonFootprint:
 *                           type: number
 *                           example: 148.23
 *                         category:
 *                           type: string
 *                           example: "Very High Impact"
 *                         breakdown:
 *                           type: object
 *                           description: Carbon footprint breakdown by category
 *                     challengeStats:
 *                       type: object
 *                       properties:
 *                         totalCompleted:
 *                           type: number
 *                           example: 3
 *                           description: Number of challenges completed
 *                         totalActive:
 *                           type: number
 *                           example: 2
 *                           description: Number of currently active challenges
 *                         totalPointsFromChallenges:
 *                           type: number
 *                           example: 75
 *                           description: Total points earned from completed challenges
 *                         recentCompletions:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 example: "zero_waste_lifestyle"
 *                               name:
 *                                 type: string
 *                                 example: "Zero Waste Lifestyle"
 *                               pointsEarned:
 *                                 type: number
 *                                 example: 50
 *                               completedAt:
 *                                 type: string
 *                                 format: date-time
 *                               badgeEarned:
 *                                 type: string
 *                                 example: "Eco Warrior"
 *                           description: List of recently completed challenges
 *                     pointsBreakdown:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                           example: 125
 *                           description: Total eco points
 *                         fromChallenges:
 *                           type: number
 *                           example: 75
 *                           description: Points earned from challenges
 *                         fromOnboarding:
 *                           type: number
 *                           example: 50
 *                           description: Bonus points from completing onboarding
 *                         fromDailyLogs:
 *                           type: number
 *                           example: 0
 *                           description: Points earned from daily log submissions
 *                     streakInfo:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: number
 *                           example: 5
 *                           description: Current streak count
 *                         lastDate:
 *                           type: string
 *                           nullable: true
 *                           example: "2025-08-05"
 *                           description: Last date of activity
 *                     levelProgress:
 *                       type: object
 *                       properties:
 *                         currentLevel:
 *                           type: number
 *                           example: 2
 *                           description: Current user level
 *                         pointsInCurrentLevel:
 *                           type: number
 *                           example: 25
 *                           description: Points accumulated in current level
 *                         pointsToNextLevel:
 *                           type: number
 *                           example: 75
 *                           description: Points needed to reach next level
 *                         totalPointsForNextLevel:
 *                           type: number
 *                           example: 200
 *                           description: Total points required for next level
 *       401:
 *         description: Unauthorized - Invalid or missing authentication token
 *       500:
 *         description: Server error - Failed to retrieve dashboard data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to fetch dashboard data."
 */
router.post("/submit", verifyToken, submitOnboarding);
router.get("/dashboard", verifyToken, getDashboardData);

export default router;
