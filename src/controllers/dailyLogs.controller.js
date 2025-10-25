// src/controllers/dailyLogs.controller.js

import { getFirestore } from "firebase-admin/firestore";
import { calculateCarbonFootprintFromDailyLog } from "../utils/carbonLogic.js";
import { updateGamificationAfterDailyLog } from "./gamification.controller.js";
import { updateChallengeProgressFixed } from "./challenges.controller.fixed.js";

const db = getFirestore();

export const submitDailyLog = async (req, res) => {
  const { uid } = req.user;
  const {
    date,
    totalDistanceTraveled,
    primaryTransportMode,
    totalMealsToday,
    mealsWithMeat,
    ateOutsideOrOrdered,
    acUsageHours,
    highPowerAppliances,
    aiTipId,
  } = req.body;

  if (!date) return res.status(400).json({ message: "Date is required" });

  try {
    // ✅ Fetch user profile for response (optional - won't fail if missing)
    let userProfile = null;
    try {
      const onboardingRef = db
        .collection("users")
        .doc(uid)
        .collection("onboardingProfile")
        .doc("data");
      const onboardingDoc = await onboardingRef.get();

      if (onboardingDoc.exists) {
        userProfile = onboardingDoc.data();
      }
    } catch (profileError) {
      console.log("User profile not found, continuing without it");
    }

    // ✅ Build daily log data structure for carbon calculation
    const dailyLogData = {
      transport: {},
      diet: {},
      electricity: {},
      lifestyle: {},
    };

    // ⬇️ Transport
    if (totalDistanceTraveled) {
      dailyLogData.transport.totalDistance = totalDistanceTraveled;
    }
    if (primaryTransportMode) {
      const transportModeMapping = {
        car: "personal_car",
        bike: "two_wheeler",
        metro: "metro_train",
        bus: "bus",
        walking: "walking",
        work_from_home: "work_from_home",
      };
      dailyLogData.transport.primaryMode =
        transportModeMapping[primaryTransportMode] || primaryTransportMode;
    }

    // ⬇️ Diet
    if (totalMealsToday !== undefined) {
      dailyLogData.diet.mealsToday = totalMealsToday;
    }
    if (mealsWithMeat !== undefined) {
      dailyLogData.diet.meatMeals = mealsWithMeat;
    }
    if (ateOutsideOrOrdered !== undefined) {
      dailyLogData.diet.ateOutside = ateOutsideOrOrdered;
    }

    // ⬇️ Electricity
    if (acUsageHours) {
      // Map the values to what the carbon logic expects
      const acUsageMapping = {
        0: "0",
        less_than_2: "less_2",
        "2_to_4": "2_4",
        "4_plus": "4plus",
      };
      dailyLogData.electricity.acHours = acUsageMapping[acUsageHours];
    }
    if (highPowerAppliances && Array.isArray(highPowerAppliances)) {
      dailyLogData.electricity.appliances = highPowerAppliances;
    }

    // ⬇️ Lifestyle

    // ✅ Calculate carbon footprint using dedicated daily log function
    const carbonFootprint = calculateCarbonFootprintFromDailyLog(dailyLogData);

    const dailyLogRef = db
      .collection("users")
      .doc(uid)
      .collection("dailyLogs")
      .doc(date);

    const documentData = {
      date,
      calculatedDailyCarbonFootprint: carbonFootprint.total,
      carbonBreakdown: carbonFootprint.breakdown,
      dailyLogAnswers: {
        transport: { totalDistanceTraveled, primaryTransportMode },
        diet: { totalMealsToday, mealsWithMeat, ateOutsideOrOrdered },
        electricity: {
          acUsageHours,
          highPowerAppliances: highPowerAppliances || [],
        },
        lifestyle: {},
      },
      dailyLogData: dailyLogData, // Store the processed data structure
      updatedAt: new Date(),
    };

    if (aiTipId !== undefined) documentData.aiTipId = aiTipId;

    await dailyLogRef.set(documentData, { merge: true });

    // ✅ Update daily log streak and award points/badges
    let streakResult = null;
    try {
      streakResult = await updateDailyLogStreak(uid, date);
    } catch (streakError) {
      console.error("Error updating daily log streak:", streakError);
      // Don't fail the daily log submission if streak update fails
    }

    // NOTE: updateGamificationAfterDailyLog is NOT called here because
    // updateDailyLogStreak already handles all gamification updates
    // Calling both would cause conflicts and override our streak data

    // Challenge
    try {
      await updateChallengeProgressFixed(uid, documentData);
    } catch (challengeError) {
      console.error("Challenge update error:", challengeError);
    }

    // Prepare response data
    const response = {
      message: "Daily log submitted",
      carbonFootprint: carbonFootprint.total,
      breakdown: carbonFootprint.breakdown,
    };

    // Add streak information to response
    if (streakResult) {
      response.streak = {
        currentStreak: streakResult.streak,
        pointsAwarded: streakResult.pointsAwarded,
        badgeAwarded: streakResult.badgeAwarded,
        totalPoints: streakResult.totalPoints,
      };
    }

    // Add user profile to response if available
    if (userProfile) {
      response.profile = {
        transport: userProfile.transport || {},
        diet: userProfile.diet || {},
        electricity: userProfile.electricity || {},
        lifestyle: userProfile.lifestyle || {},
      };
    }

    res.status(200).json(response);
  } catch (err) {
    console.error("Daily log error:", err);
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
    let daysWithData = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      logs.push(data);

      // Calculate aggregated stats
      if (data.calculatedDailyCarbonFootprint) {
        totalCarbonFootprint += data.calculatedDailyCarbonFootprint;
        daysWithData++;
      }
    });

    // Calculate averages
    const averageCarbonFootprint =
      daysWithData > 0
        ? parseFloat((totalCarbonFootprint / daysWithData).toFixed(2))
        : 0;

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

// ✅ Function to update daily log streak and award points/badges
const updateDailyLogStreak = async (uid, currentDate) => {
  try {
    console.log(`🔥 UPDATING DAILY LOG STREAK for ${uid} on ${currentDate}`);

    const gamificationRef = db
      .collection("users")
      .doc(uid)
      .collection("gamification")
      .doc("data");

    const gamificationDoc = await gamificationRef.get();
    let gamificationData = gamificationDoc.exists ? gamificationDoc.data() : {};

    // Initialize streak data if not exists
    const currentStreak = gamificationData.dailyLogStreak || 0;
    const lastLogDate = gamificationData.lastDailyLogDate || null;
    const streakBadges = gamificationData.streakBadges || [];
    const currentEcoPoints = gamificationData.ecoPoints || 0;

    console.log(
      `📊 Current streak data: streak=${currentStreak}, lastDate=${lastLogDate}, points=${currentEcoPoints}`
    );

    let newStreak = currentStreak;
    let streakBroken = false;

    // Check if this is continuation of streak or new/broken streak
    if (!lastLogDate) {
      // First daily log ever
      newStreak = 1;
      console.log("🎉 First daily log! Starting streak at 1");
    } else {
      // Use string date comparison for accuracy
      const todayString = currentDate; // Already in YYYY-MM-DD format
      const lastDateString = lastLogDate; // Should be in YYYY-MM-DD format

      console.log(
        `📅 Date comparison: last=${lastDateString}, today=${todayString}`
      );

      // Convert to Date objects for day difference calculation
      const lastDate = new Date(lastDateString + "T00:00:00");
      const todayDate = new Date(todayString + "T00:00:00");
      const daysDifference = Math.floor(
        (todayDate - lastDate) / (1000 * 60 * 60 * 24)
      );

      console.log(`📊 Days difference: ${daysDifference}`);

      if (daysDifference === 0) {
        // Same day - don't update streak, just award daily point
        console.log("📅 Same day log - no streak change");
        newStreak = currentStreak;
      } else if (daysDifference === 1) {
        // Consecutive day - increment streak
        newStreak = currentStreak + 1;
        console.log(
          `🔥 Consecutive day! Streak: ${currentStreak} → ${newStreak}`
        );
      } else {
        // Gap in days - reset streak to 1 (starting fresh)
        newStreak = 1;
        streakBroken = true;
        console.log(
          `💔 Streak broken after ${currentStreak} days (gap of ${daysDifference} days). Starting fresh with new streak.`
        );
      }
    }

    // Award daily point for logging (always given)
    const updatedEcoPoints = currentEcoPoints + 1;
    console.log(
      `💰 Daily log point awarded: ${currentEcoPoints} + 1 = ${updatedEcoPoints}`
    );

    // Check for streak milestone badges
    let badgeAwarded = null;
    let bonusPoints = 0;

    if (newStreak === 7 && !streakBadges.includes("7_day_streak")) {
      // 7-day streak badge
      badgeAwarded = "7_day_streak";
      bonusPoints = 30;
      streakBadges.push("7_day_streak");
      console.log("🏆 7-DAY STREAK BADGE EARNED! +30 bonus points");
    } else if (newStreak === 14 && !streakBadges.includes("14_day_streak")) {
      // 14-day streak badge
      badgeAwarded = "14_day_streak";
      bonusPoints = 50;
      streakBadges.push("14_day_streak");
      console.log("🏆 14-DAY STREAK BADGE EARNED! +50 bonus points");
    } else if (newStreak === 30 && !streakBadges.includes("30_day_streak")) {
      // 30-day streak badge
      badgeAwarded = "30_day_streak";
      bonusPoints = 100;
      streakBadges.push("30_day_streak");
      console.log("🏆 30-DAY STREAK BADGE EARNED! +100 bonus points");
    }

    const finalEcoPoints = updatedEcoPoints + bonusPoints;

    // Update gamification data
    const updateData = {
      ecoPoints: finalEcoPoints,
      dailyLogStreak: newStreak,
      lastDailyLogDate: currentDate,
      streakBadges: streakBadges,
      updatedAt: new Date(),
    };

    // Set streak start date logic
    if (newStreak === 1 || streakBroken) {
      // New streak starting or streak was broken - set start date to today
      updateData.streakStartDate = currentDate;
    } else if (!gamificationData.streakStartDate && newStreak > 1) {
      // Existing streak but no start date recorded (for backward compatibility)
      // Only calculate if we're confident the streak is continuous
      const startDateObj = new Date(currentDate);
      startDateObj.setDate(startDateObj.getDate() - newStreak + 1);
      updateData.streakStartDate = startDateObj.toISOString().split("T")[0];
    }

    // Save previous best streak if current streak is broken and was longer
    if (
      streakBroken &&
      currentStreak > (gamificationData.previousBestStreak || 0)
    ) {
      updateData.previousBestStreak = currentStreak;
      console.log(`🏆 New personal best streak record: ${currentStreak} days`);
    }

    // Update level based on new points
    updateData.level = Math.floor(finalEcoPoints / 100) + 1;

    // Add new badge to general badges list if earned
    if (badgeAwarded) {
      const allBadges = gamificationData.badges || [];
      if (!allBadges.includes(badgeAwarded)) {
        allBadges.push(badgeAwarded);
        updateData.badges = allBadges;
      }
    }

    // Handle streak broken case
    if (streakBroken) {
      updateData.lastStreakBroken = new Date();
      updateData.previousBestStreak = Math.max(
        currentStreak,
        gamificationData.previousBestStreak || 0
      );
    }

    // Update or create gamification document
    if (gamificationDoc.exists) {
      await gamificationRef.update(updateData);
      console.log(
        `💾 Updated existing gamification doc with streak=${newStreak}, lastDate=${currentDate}`
      );
    } else {
      await gamificationRef.set({
        ...updateData,
        totalDailyLogsSubmitted: 1,
        createdAt: new Date(),
      });
      console.log(
        `💾 Created new gamification doc with streak=${newStreak}, lastDate=${currentDate}`
      );
    }

    console.log(
      `✅ STREAK UPDATED: ${newStreak} days | Points: ${finalEcoPoints} | Badge: ${
        badgeAwarded || "none"
      }`
    );

    return {
      success: true,
      streak: newStreak,
      pointsAwarded: 1 + bonusPoints,
      badgeAwarded,
      totalPoints: finalEcoPoints,
    };
  } catch (error) {
    console.error("❌ Error updating daily log streak:", error);
    throw error;
  }
};
