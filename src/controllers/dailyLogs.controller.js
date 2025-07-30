// src/controllers/dailyLogs.controller.js

import { getFirestore } from "firebase-admin/firestore";
import { calculateDailyOverride } from "../utils/carbonLogic.js";
import { updateGamificationAfterDailyLog } from "./gamification.controller.js";
import { updateChallengeProgress } from "./challenges.controller.js";

const db = getFirestore();

// POST /api/daily-logs/submit
export const submitDailyLog = async (req, res) => {
  const { uid } = req.user;
  const {
    date,
    // Transport questions
    totalDistanceTraveled,  // "0_5km" | "6_15km" | "16_30km" | "31_50km" | "51plus_km"
    primaryTransportMode,   // "car" | "bike" | "metro" | "bus" | "walking" | "work_from_home"
    
    // Diet questions
    totalMealsToday,        // 1 | 2 | 3 | 4 (4+ = 4)
    mealsWithMeat,          // 0 | 1 | 2 | 3 (3+ = 3)
    ateOutsideOrOrdered,    // true | false
    
    // Electricity questions
    acUsageHours,           // "0" | "less_than_2" | "2_to_4" | "4_plus"
    highPowerAppliances,    // array: ["geyser", "microwave", "washing_machine"] or []
    workedFromHome,         // true | false
    
    // Lifestyle questions
    placedOnlineOrders,     // true | false
    screenTimeHours,        // "less_than_2" | "2_to_4" | "4_to_6" | "6_plus"
    segregatedWaste,        // true | false
    
    // Optional fitness data
    steps,
    distance, // optional calculated field
    caloriesBurned,
    aiTipId,
  } = req.body;

  if (!date) return res.status(400).json({ message: "Date is required" });

  try {
    // Get user's baseline profile for carbon calculation
    const onboardingRef = db
      .collection("users")
      .doc(uid)
      .collection("onboardingProfile")
      .doc("data");
    const onboardingDoc = await onboardingRef.get();

    if (!onboardingDoc.exists) {
      return res.status(400).json({
        error: "User must complete onboarding before submitting daily logs",
      });
    }

    const userProfile = onboardingDoc.data();

    // Convert daily log answers to override format for carbon calculation
    const overrideData = {
      transport: {},
      diet: {},
      electricity: {},
      lifestyle: {},
    };

    // Transport overrides
    if (totalDistanceTraveled) {
      overrideData.transport.dailyDistance = totalDistanceTraveled;
    }
    if (primaryTransportMode) {
      // Map daily log values to onboarding profile values
      const transportModeMapping = {
        car: "personal_car",
        bike: "two_wheeler", 
        metro: "metro_train",
        bus: "bus",
        walking: "walking",
        work_from_home: "work_from_home"
      };
      overrideData.transport.primaryMode = transportModeMapping[primaryTransportMode] || primaryTransportMode;
    }

    // Diet overrides
    if (totalMealsToday !== undefined) {
      overrideData.diet.mealsPerDay = totalMealsToday;
    }
    if (mealsWithMeat !== undefined) {
      // Calculate meat percentage based on meals with meat
      const meatPercentage = totalMealsToday > 0 ? (mealsWithMeat / totalMealsToday) * 100 : 0;
      overrideData.diet.meatPercentage = Math.round(meatPercentage);
      overrideData.diet.plantPercentage = Math.round(100 - meatPercentage);
    }
    if (ateOutsideOrOrdered !== undefined) {
      // Map to ordered meals frequency
      overrideData.diet.orderedMealsFreq = ateOutsideOrOrdered ? "1_2_week" : "never";
    }

    // Electricity overrides
    if (acUsageHours) {
      // Map AC usage to time at home and appliance usage
      const acUsageMapping = {
        "0": { timeAtHome: "4_hours_less", appliances: [] },
        "less_than_2": { timeAtHome: "5_8_hours", appliances: ["air_conditioner"] },
        "2_to_4": { timeAtHome: "9_12_hours", appliances: ["air_conditioner"] },
        "4_plus": { timeAtHome: "12plus_hours", appliances: ["air_conditioner"] }
      };
      const acMapping = acUsageMapping[acUsageHours];
      if (acMapping) {
        overrideData.electricity.timeAtHome = acMapping.timeAtHome;
        overrideData.electricity.appliances = [...acMapping.appliances];
      }
    }
    if (highPowerAppliances && Array.isArray(highPowerAppliances)) {
      // Add high power appliances to the appliance list
      if (!overrideData.electricity.appliances) {
        overrideData.electricity.appliances = [];
      }
      overrideData.electricity.appliances.push(...highPowerAppliances);
      // Remove duplicates
      overrideData.electricity.appliances = [...new Set(overrideData.electricity.appliances)];
    }
    if (workedFromHome !== undefined) {
      // If worked from home, ensure minimum time at home
      if (workedFromHome && !overrideData.electricity.timeAtHome) {
        overrideData.electricity.timeAtHome = "9_12_hours";
      }
    }

    // Lifestyle overrides
    if (screenTimeHours) {
      overrideData.lifestyle.screenTime = screenTimeHours;
    }
    if (placedOnlineOrders !== undefined) {
      // Map online orders to frequency
      overrideData.lifestyle.onlineOrders = placedOnlineOrders ? "1_5" : "0";
    }
    if (segregatedWaste !== undefined) {
      // Map waste segregation to waste management
      overrideData.lifestyle.wasteManagement = segregatedWaste ? "basic_segregation" : "no_segregation";
    }

    // Calculate carbon footprint with overrides
    const carbonFootprint = calculateDailyOverride(userProfile, overrideData);

    const dailyLogRef = db
      .collection("users")
      .doc(uid)
      .collection("dailyLogs")
      .doc(date);

    const documentData = {
      date,
      calculatedDailyCarbonFootprint: carbonFootprint.total,
      carbonBreakdown: carbonFootprint.breakdown,
      
      // Store original daily log answers
      dailyLogAnswers: {
        transport: {
          totalDistanceTraveled,
          primaryTransportMode,
        },
        diet: {
          totalMealsToday,
          mealsWithMeat,
          ateOutsideOrOrdered,
        },
        electricity: {
          acUsageHours,
          highPowerAppliances: highPowerAppliances || [],
          workedFromHome,
        },
        lifestyle: {
          placedOnlineOrders,
          screenTimeHours,
          segregatedWaste,
        },
      },
      
      // Store computed overrides for carbon calculation
      overrides: overrideData,
      updatedAt: new Date(),
    };

    // Add fitness data if provided
    if (steps !== undefined) {
      documentData.steps = steps;
      if (distance === undefined) {
        documentData.distance = parseFloat((steps * 0.0008).toFixed(2));
      }
    }

    if (distance !== undefined) documentData.distance = distance;
    if (caloriesBurned !== undefined)
      documentData.caloriesBurned = caloriesBurned;
    if (aiTipId !== undefined) documentData.aiTipId = aiTipId;

    await dailyLogRef.set(documentData, { merge: true });

    // Update gamification after successful daily log submission
    try {
      await updateGamificationAfterDailyLog(uid, carbonFootprint.total);
    } catch (gamificationError) {
      console.error("Error updating gamification:", gamificationError);
      // Don't fail the daily log submission if gamification update fails
    }

    // Update challenge progress after successful daily log submission
    try {
      await updateChallengeProgress(uid, documentData);
    } catch (challengeError) {
      console.error("Error updating challenge progress:", challengeError);
      // Don't fail the daily log submission if challenge update fails
    }

    res.status(200).json({
      message: "Daily log submitted",
      carbonFootprint: carbonFootprint.total,
      breakdown: carbonFootprint.breakdown,
    });
  } catch (err) {
    console.error("Error submitting daily log:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/daily-logs/:date
export const getDailyLog = async (req, res) => {
  const { uid } = req.user;
  const { date } = req.params;

  try {
    const doc = await db
      .collection("users")
      .doc(uid)
      .collection("dailyLogs")
      .doc(date)
      .get();

    if (!doc.exists) return res.status(404).json({ message: "No log found" });

    res.status(200).json(doc.data());
  } catch (err) {
    console.error("Error fetching daily log:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/daily-logs/weekly-summary
export const getWeeklySummary = async (req, res) => {
  const { uid } = req.user;
  const today = new Date();
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(today.getDate() - 6);

  try {
    const snapshot = await db
      .collection("users")
      .doc(uid)
      .collection("dailyLogs")
      .where("date", ">=", oneWeekAgo.toISOString().split("T")[0])
      .orderBy("date", "desc")
      .get();

    const logs = [];
    let totalCarbonFootprint = 0;
    let totalSteps = 0;
    let totalDistance = 0;
    let totalCaloriesBurned = 0;
    let daysWithData = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      logs.push(data);

      // Calculate aggregated stats
      if (data.calculatedDailyCarbonFootprint) {
        totalCarbonFootprint += data.calculatedDailyCarbonFootprint;
        daysWithData++;
      }
      if (data.steps) totalSteps += data.steps;
      if (data.distance) totalDistance += data.distance;
      if (data.caloriesBurned) totalCaloriesBurned += data.caloriesBurned;
    });

    // Calculate averages
    const averageCarbonFootprint =
      daysWithData > 0
        ? parseFloat((totalCarbonFootprint / daysWithData).toFixed(2))
        : 0;
    const averageSteps =
      logs.length > 0 ? Math.round(totalSteps / logs.length) : 0;

    // Create weekly summary (even if no logs exist)
    const weeklySummary = {
      dateRange: {
        from: oneWeekAgo.toISOString().split("T")[0],
        to: today.toISOString().split("T")[0],
      },
      totalDays: logs.length,
      daysWithCarbonData: daysWithData,
      aggregatedStats: {
        totalCarbonFootprint: parseFloat(totalCarbonFootprint.toFixed(2)),
        averageCarbonFootprint,
        totalSteps,
        averageSteps,
        totalDistance: parseFloat(totalDistance.toFixed(2)),
        totalCaloriesBurned,
      },
      dailyLogs: logs,
      message:
        logs.length === 0
          ? "No daily logs found for the past week"
          : `Found ${logs.length} daily log(s) for the past week`,
    };

    res.status(200).json({ weeklySummary });
  } catch (err) {
    console.error("Error fetching weekly summary:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/daily-logs/all (Debug endpoint)
export const getAllDailyLogs = async (req, res) => {
  const { uid } = req.user;

  try {
    const snapshot = await db
      .collection("users")
      .doc(uid)
      .collection("dailyLogs")
      .orderBy("date", "desc")
      .get();

    const logs = [];
    snapshot.forEach((doc) => {
      logs.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json({
      totalLogs: logs.length,
      logs,
    });
  } catch (err) {
    console.error("Error fetching all daily logs:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
