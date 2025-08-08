// src/controllers/gamification.controller.js

import { db } from "../config/firebase.js";

// Fetch user gamification profile
export const getGamificationProfile = async (req, res) => {
  const { uid } = req.user;
  try {
    if (!uid) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const gamificationRef = db
      .collection("users")
      .doc(uid)
      .collection("gamification")
      .doc("data");
    const snapshot = await gamificationRef.get();

    if (!snapshot.exists) {
      // Create default gamification profile if it doesn't exist
      const defaultGamification = {
        ecoPoints: 0,
        level: 1,
        dailyLogStreak: 0,
        lastDailyLogDate: null,
        streakStartDate: null,
        badges: [],
        streakBadges: [],
        createdAt: new Date(),
      };

      await gamificationRef.set(defaultGamification);
      return res.status(200).json({ gamification: defaultGamification });
    }

    return res.status(200).json({ gamification: snapshot.data() });
  } catch (err) {
    console.error("getGamificationProfile error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Update ecoPoints, level, streaks, and badges after daily log (utility function)
export const updateGamificationAfterDailyLog = async (uid, carbonFootprint) => {
  try {
    if (!uid) {
      console.error("updateGamificationAfterDailyLog error: uid is required");
      return;
    }

    const gamificationRef = db
      .collection("users")
      .doc(uid)
      .collection("gamification")
      .doc("data");
    const snapshot = await gamificationRef.get();

    let ecoPoints = 0;
    let level = 1;
    let dailyLogStreak = 0;
    let lastDailyLogDate = null;
    let streakStartDate = null;
    let badges = [];

    if (snapshot.exists) {
      const data = snapshot.data();
      ecoPoints = data.ecoPoints || 0;
      level = data.level || 1;
      dailyLogStreak = data.dailyLogStreak || 0;
      lastDailyLogDate = data.lastDailyLogDate || null;
      streakStartDate = data.streakStartDate || null;
      badges = data.badges || [];
    }

    // Calculate points based on carbon footprint reduction (simplified logic)
    const pointsEarned = Math.max(0, Math.round((5 - carbonFootprint) * 10));
    ecoPoints += pointsEarned;

    // Level up every 100 points (example logic)
    level = Math.floor(ecoPoints / 100) + 1;

    // Update streaks
    const today = new Date().toISOString().split("T")[0];
    if (lastDailyLogDate === today) {
      // Already logged today, no change
    } else if (
      lastDailyLogDate ===
      new Date(Date.now() - 86400000).toISOString().split("T")[0]
    ) {
      // Increment streak
      dailyLogStreak += 1;
      lastDailyLogDate = today;
      // Set start date if it doesn't exist (for existing streaks that didn't have start date)
      if (!streakStartDate) {
        // Calculate start date based on current streak count
        const startDateObj = new Date();
        startDateObj.setDate(startDateObj.getDate() - dailyLogStreak + 1);
        streakStartDate = startDateObj.toISOString().split("T")[0];
      }
    } else {
      // Reset streak
      dailyLogStreak = 1;
      lastDailyLogDate = today;
      streakStartDate = today;
    }

    // Update badges
    if (ecoPoints >= 100 && !badges.includes("100_points")) {
      badges.push("100_points");
    }
    if (dailyLogStreak >= 7 && !badges.includes("7_day_streak")) {
      badges.push("7_day_streak");
    }

    await gamificationRef.set(
      {
        ecoPoints,
        level,
        dailyLogStreak,
        lastDailyLogDate,
        streakStartDate,
        badges,
      },
      { merge: true }
    );

    return {
      ecoPoints,
      level,
      pointsEarned,
      streakInfo: {
        count: dailyLogStreak,
        lastDate: lastDailyLogDate,
        startDate: streakStartDate,
      },
      badges,
    };
  } catch (err) {
    console.error("updateGamificationAfterDailyLog error:", err);
    throw err;
  }
};

// Update gamification via API endpoint
export const updateGamificationAPI = async (req, res) => {
  try {
    const { uid } = req.user;
    const { carbonFootprint } = req.body;

    if (!uid) {
      return res.status(400).json({ message: "User ID is required" });
    }

    if (carbonFootprint === undefined) {
      return res.status(400).json({ message: "Carbon footprint is required" });
    }

    const result = await updateGamificationAfterDailyLog(uid, carbonFootprint);

    return res.status(200).json({
      message: "Gamification updated successfully",
      gamification: result,
    });
  } catch (err) {
    console.error("updateGamificationAPI error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Reset gamification profile (optional utility)
export const resetGamificationProfile = async (req, res) => {
  const { uid } = req.user;
  try {
    const gamificationRef = db
      .collection("users")
      .doc(uid)
      .collection("gamification")
      .doc("data");
    await gamificationRef.set({
      ecoPoints: 0,
      level: 1,
      dailyLogStreak: 0,
      lastDailyLogDate: null,
      streakStartDate: null,
      badges: [],
      streakBadges: [],
    });
    return res.status(200).json({ message: "Gamification profile reset." });
  } catch (err) {
    console.error("resetGamificationProfile error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
