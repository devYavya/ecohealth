// src/controllers/dailyLogs.controller.js

import { getFirestore } from "firebase-admin/firestore";
import { calculateCarbonFootprintFromDailyLog } from "../utils/carbonLogic.js";
import { updateGamificationAfterDailyLog } from "./gamification.controller.js";
import { updateChallengeProgress } from "./challenges.controller.js";

const db = getFirestore();

// POST /api/daily-logs/submit
export const submitDailyLog = async (req, res) => {
  const { uid } = req.user;
  const {
    date,
    transportInput,
    dietInput,
    electricityUsage, // in hours
    digitalUsage, // in hours
    steps,
    distance, // optional
    caloriesBurned,
    aiTipId,
  } = req.body;

  if (!date) return res.status(400).json({ message: "Date is required" });

  try {
    const carbonFootprint = calculateCarbonFootprintFromDailyLog({
      transportInput,
      dietInput,
      electricityUsage,
      digitalUsage,
      steps,
    });

    const dailyLogRef = db
      .collection("users")
      .doc(uid)
      .collection("dailyLogs")
      .doc(date);

    const documentData = {
      date,
      calculatedDailyCarbonFootprint: carbonFootprint,
      updatedAt: new Date(),
    };

    if (transportInput !== undefined)
      documentData.transportInput = transportInput;
    if (dietInput !== undefined) documentData.dietInput = dietInput;
    if (electricityUsage !== undefined)
      documentData.electricityUsage = electricityUsage;
    if (digitalUsage !== undefined) documentData.digitalUsage = digitalUsage;
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
      await updateGamificationAfterDailyLog(uid, carbonFootprint);
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

    res.status(200).json({ message: "Daily log submitted", carbonFootprint });
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
