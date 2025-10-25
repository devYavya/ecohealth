import { getFirestore } from "firebase-admin/firestore";
import GeminiService from "../services/gemini.service.js";
import challengeCacheService from "../services/challengeCache.service.js";

const db = getFirestore();

export const getChallenges = async (req, res) => {
  try {
    const snapshot = await db.collection("challenges").get();
    const challenges = [];

    snapshot.forEach((doc) => {
      challenges.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json({
      message: "Challenges retrieved successfully",
      challenges,
    });
  } catch (err) {
    console.error("Error fetching challenges:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Generate personalized challenges using smart caching
export const generatePersonalizedChallenges = async (req, res) => {
  const { uid } = req.user;

  try {
    // Get user's onboarding profile
    const onboardingRef = db
      .collection("users")
      .doc(uid)
      .collection("onboardingProfile")
      .doc("data");
    const onboardingDoc = await onboardingRef.get();

    if (!onboardingDoc.exists) {
      return res.status(400).json({
        error:
          "User must complete onboarding before generating personalized challenges",
      });
    }

    // Get user's current carbon footprint
    const carbonRef = db
      .collection("users")
      .doc(uid)
      .collection("carbonProfile")
      .doc("baseline");
    const carbonDoc = await carbonRef.get();

    const currentCarbonFootprint = carbonDoc.exists
      ? carbonDoc.data().totalCarbonFootprint || 20
      : 20;

    const userProfile = onboardingDoc.data();

    // Use smart caching service to get challenges
    const challengeResult = await challengeCacheService.getCachedChallenges(
      uid,
      userProfile,
      currentCarbonFootprint
    );

    return res.status(200).json({
      message: "Personalized challenges generated successfully",
      challenges: challengeResult.challenges,
      metadata: {
        fromCache: challengeResult.fromCache || false,
        cacheAge: challengeResult.cacheAge || 0,
        carbonFootprint: currentCarbonFootprint,
        generationMethod: challengeResult.fromCache ? "cached" : "ai-generated",
      },
    });
  } catch (error) {
    console.error("Error generating personalized challenges:", error);

    // Fallback to static challenges
    const fallbackChallenges = GeminiService.getFallbackChallenges();

    return res.status(200).json({
      message: "Generated fallback challenges due to error",
      challenges: fallbackChallenges.challenges,
      metadata: {
        fromCache: false,
        generationMethod: "fallback",
        error: error.message,
      },
    });
  }
};

// Refresh challenges manually (force new generation)
export const refreshPersonalizedChallenges = async (req, res) => {
  const { uid } = req.user;

  try {
    // Get user's onboarding profile
    const onboardingRef = db
      .collection("users")
      .doc(uid)
      .collection("onboardingProfile")
      .doc("data");
    const onboardingDoc = await onboardingRef.get();

    if (!onboardingDoc.exists) {
      return res.status(400).json({
        error: "User must complete onboarding before generating challenges",
      });
    }

    // Get user's current carbon footprint
    const carbonRef = db
      .collection("users")
      .doc(uid)
      .collection("carbonProfile")
      .doc("baseline");
    const carbonDoc = await carbonRef.get();

    const currentCarbonFootprint = carbonDoc.exists
      ? carbonDoc.data().totalCarbonFootprint || 20
      : 20;

    const userProfile = onboardingDoc.data();

    // Force refresh challenges
    const challengeResult = await challengeCacheService.refreshChallenges(
      uid,
      userProfile,
      currentCarbonFootprint
    );

    return res.status(200).json({
      message: "Challenges refreshed successfully",
      challenges: challengeResult.challenges,
      metadata: {
        fromCache: false,
        generationMethod: "ai-generated-fresh",
        carbonFootprint: currentCarbonFootprint,
      },
    });
  } catch (error) {
    console.error("Error refreshing challenges:", error);
    return res.status(500).json({
      error: "Failed to refresh challenges",
      details: error.message,
    });
  }
};

// Get API usage statistics (admin only)
export const getApiUsageStats = async (req, res) => {
  try {
    const stats = await challengeCacheService.getApiUsageStats();

    return res.status(200).json({
      message: "API usage statistics retrieved",
      stats: {
        ...stats,
        estimatedMonthlyCost: stats.totalApiCalls * 0.002, // Rough estimate
        cacheEfficiency:
          stats.totalUsers > 0
            ? (
                ((stats.totalUsers - stats.totalApiCalls) / stats.totalUsers) *
                100
              ).toFixed(1) + "%"
            : "N/A",
      },
    });
  } catch (error) {
    console.error("Error getting API stats:", error);
    return res.status(500).json({
      error: "Failed to get API usage statistics",
      details: error.message,
    });
  }
};

export const joinChallenge = async (req, res) => {
  const { uid } = req.user;
  const { challengeId } = req.params;

  try {
    const challengeDoc = await db
      .collection("challenges")
      .doc(challengeId)
      .get();
    if (!challengeDoc.exists) {
      return res.status(404).json({ message: "Challenge not found" });
    }

    const userChallengeDoc = await db
      .collection("users")
      .doc(uid)
      .collection("challenges")
      .doc(challengeId)
      .get();

    if (userChallengeDoc.exists) {
      return res
        .status(400)
        .json({ message: "Already participating in this challenge" });
    }

    const challengeData = challengeDoc.data();
    const userChallengeData = {
      challengeId,
      joinedAt: new Date(),
      progress: 0,
      isCompleted: false,
      completedAt: null,
      pointsEarned: 0,
      badgeEarned: null,
      challengeName: challengeData.name,
      challengeType: challengeData.type,
      pointsAwarded: challengeData.pointsAwarded,
      badgeAwarded: challengeData.badgeAwarded,
      criteria: challengeData.criteria,
      endDate: challengeData.endDate,
    };

    await db
      .collection("users")
      .doc(uid)
      .collection("challenges")
      .doc(challengeId)
      .set(userChallengeData);

    res.status(200).json({
      message: "Successfully joined challenge",
      challenge: userChallengeData,
    });
  } catch (err) {
    console.error("Error joining challenge:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const leaveChallenge = async (req, res) => {
  const { uid } = req.user;
  const { challengeId } = req.params;

  try {
    // Check if user is participating
    const userChallengeDoc = await db
      .collection("users")
      .doc(uid)
      .collection("challenges")
      .doc(challengeId)
      .get();

    if (!userChallengeDoc.exists) {
      return res
        .status(404)
        .json({ message: "Not participating in this challenge" });
    }

    const challengeData = userChallengeDoc.data();
    if (challengeData.isCompleted) {
      return res
        .status(400)
        .json({ message: "Cannot leave a completed challenge" });
    }

    // Remove user from challenge
    await db
      .collection("users")
      .doc(uid)
      .collection("challenges")
      .doc(challengeId)
      .delete();

    res.status(200).json({
      message: "Successfully left challenge",
    });
  } catch (err) {
    console.error("Error leaving challenge:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/challenges/my-challenges - Get user's active and completed challenges
export const getMyChallenges = async (req, res) => {
  const { uid } = req.user;

  try {
    const snapshot = await db
      .collection("users")
      .doc(uid)
      .collection("challenges")
      .orderBy("joinedAt", "desc")
      .get();

    const challenges = [];

    for (const doc of snapshot.docs) {
      const userChallengeData = doc.data();

      const mainChallengeDoc = await db
        .collection("challenges")
        .doc(userChallengeData.challengeId)
        .get();

      const mainChallengeData = mainChallengeDoc.exists
        ? mainChallengeDoc.data()
        : {};

      challenges.push({
        id: doc.id,
        ...userChallengeData,
        description:
          mainChallengeData.description || "No description available",
        difficulty: mainChallengeData.difficulty || "medium",
      });
    }

    const activeChallenges = challenges.filter(
      (challenge) => !challenge.isCompleted
    );
    const completedChallenges = challenges.filter(
      (challenge) => challenge.isCompleted
    );

    res.status(200).json({
      message: "User challenges retrieved successfully",
      activeChallenges,
      completedChallenges,
      totalChallenges: challenges.length,
    });
  } catch (err) {
    console.error("Error fetching user challenges:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateChallengeProgress = async (uid, dailyLogData) => {
  try {
    // Get all active challenges for the user
    const challengesSnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("challenges")
      .where("isCompleted", "==", false)
      .get();

    const batch = db.batch();
    const updates = [];

    for (const challengeDoc of challengesSnapshot.docs) {
      const challengeData = challengeDoc.data();
      const { criteria, challengeId, pointsAwarded, badgeAwarded, type } =
        challengeData;

      let criteriaMetToday = false;
      let progressIncrement = 0;

      // Enhanced criteria checking based on challenge type and actual criteria structure
      if (type === "diet") {
        // Check diet-related criteria
        if (criteria.dietInput && dailyLogData.overrides?.diet) {
          const userDietChoice = dailyLogData.overrides.diet.primaryChoice;
          if (userDietChoice === criteria.dietInput) {
            criteriaMetToday = true;
            progressIncrement = 1;
          }
        }

        // Check meat percentage reduction (for personalized challenges)
        if (criteria.meatPercentage && dailyLogData.overrides?.diet) {
          const meatReduction = dailyLogData.overrides.diet.meatPercentage || 0;
          const targetReduction =
            parseInt(criteria.meatPercentage.replace(/\D/g, "")) || 10;
          if (meatReduction <= 100 - targetReduction) {
            criteriaMetToday = true;
            progressIncrement = 1;
          }
        }

        // Check plant percentage increase (for personalized challenges)
        if (criteria.plantPercentage && dailyLogData.overrides?.diet) {
          const plantIncrease =
            dailyLogData.overrides.diet.plantPercentage || 0;
          const targetPlant =
            parseInt(criteria.plantPercentage.replace(/\D/g, "")) || 60;
          if (plantIncrease >= targetPlant) {
            criteriaMetToday = true;
            progressIncrement = 1;
          }
        }

        // Check ordered meals frequency reduction
        if (criteria.orderedMealsFreq && dailyLogData.overrides?.diet) {
          const orderedMeals =
            dailyLogData.overrides.diet.orderedMealsCount || 0;
          const targetMax =
            parseInt(criteria.orderedMealsFreq.split("-")[1]) || 12;
          if (orderedMeals <= targetMax) {
            criteriaMetToday = true;
            progressIncrement = 1;
          }
        }
      }

      if (type === "transport") {
        // Check transport input criteria
        if (criteria.transportInput && dailyLogData.overrides?.transport) {
          const transportMode = dailyLogData.overrides.transport.primaryMode;
          if (
            transportMode === criteria.transportInput ||
            (criteria.transportInput === "cycling" &&
              ["bicycle", "walking"].includes(transportMode)) ||
            (criteria.transportInput === "public" &&
              ["bus", "metro_train"].includes(transportMode))
          ) {
            criteriaMetToday = true;
            progressIncrement = 1;
          }
        }

        // Check public transport criteria (legacy)
        if (criteria.publicTransport && dailyLogData.overrides?.transport) {
          const transportMode = dailyLogData.overrides.transport.primaryMode;
          if (
            ["bus", "metro_train", "bicycle", "walking"].includes(transportMode)
          ) {
            criteriaMetToday = true;
            progressIncrement = 1;
          }
        }

        // Check carbon reduction
        if (criteria.carbonReduction && dailyLogData.carbonBreakdown) {
          const transportCarbon = dailyLogData.carbonBreakdown.transport || 0;
          const baselineTransport = 8; // Should get from user profile
          const reduction =
            ((baselineTransport - transportCarbon) / baselineTransport) * 100;
          if (reduction >= (criteria.carbonReduction || 10)) {
            criteriaMetToday = true;
            progressIncrement = 1;
          }
        }
      }

      if (type === "electricity") {
        // Check electricity usage criteria
        if (criteria.electricityUsage && dailyLogData.carbonBreakdown) {
          const electricityCarbon =
            dailyLogData.carbonBreakdown.electricity || 0;
          if (electricityCarbon <= criteria.electricityUsage) {
            criteriaMetToday = true;
            progressIncrement = 1;
          }
        }

        // Check air conditioner usage reduction (for personalized challenges)
        if (
          criteria.airConditionerUsage &&
          dailyLogData.overrides?.electricity
        ) {
          const acUsage =
            dailyLogData.overrides.electricity.airConditionerHours || 0;
          const maxAllowed = 6; // Assuming baseline of 8 hours, reduced by 2
          if (acUsage <= maxAllowed) {
            criteriaMetToday = true;
            progressIncrement = 1;
          }
        }

        // Check electricity reduction percentage (legacy)
        if (criteria.electricityReduction && dailyLogData.carbonBreakdown) {
          const electricityCarbon =
            dailyLogData.carbonBreakdown.electricity || 0;
          const baselineElectricity = 4; // Should get from user profile
          const reduction =
            ((baselineElectricity - electricityCarbon) / baselineElectricity) *
            100;
          if (reduction >= (criteria.electricityReduction || 15)) {
            criteriaMetToday = true;
            progressIncrement = 1;
          }
        }

        // Check unplugged appliances
        if (
          criteria.unpluggedAppliances &&
          dailyLogData.overrides?.electricity
        ) {
          const unpluggedCount =
            dailyLogData.overrides.electricity.unpluggedDevices || 0;
          if (unpluggedCount >= 3) {
            // At least 3 devices unplugged
            criteriaMetToday = true;
            progressIncrement = 1;
          }
        }
      }

      if (type === "water") {
        // Check water usage criteria
        if (criteria.waterUsage && dailyLogData.carbonBreakdown) {
          const waterCarbon = dailyLogData.carbonBreakdown.water || 0;
          if (waterCarbon <= criteria.waterUsage) {
            criteriaMetToday = true;
            progressIncrement = 1;
          }
        }

        // Check shower time reduction
        if (criteria.showerTime && dailyLogData.overrides?.water) {
          const showerMinutes = dailyLogData.overrides.water.showerMinutes || 0;
          if (showerMinutes <= criteria.showerTime) {
            criteriaMetToday = true;
            progressIncrement = 1;
          }
        }
      }

      if (type === "digital") {
        // Check digital usage criteria
        if (criteria.digitalUsage && dailyLogData.carbonBreakdown) {
          const digitalCarbon = dailyLogData.carbonBreakdown.digital || 0;
          if (digitalCarbon <= criteria.digitalUsage) {
            criteriaMetToday = true;
            progressIncrement = 1;
          }
        }
      }

      if (type === "lifestyle") {
        // Check daily logging criteria
        if (criteria.dailyLogging && dailyLogData.date) {
          criteriaMetToday = true;
          progressIncrement = 1;
        }

        // Check waste reduction (simplified for lifestyle challenges)
        if (criteria.wasteReduction && dailyLogData.overrides?.lifestyle) {
          const wasteManagement =
            dailyLogData.overrides.lifestyle.wasteManagement;
          if (
            wasteManagement === "recycle_compost" ||
            wasteManagement === "basic_segregation"
          ) {
            criteriaMetToday = true;
            progressIncrement = 1;
          }
        }

        // For lifestyle challenges, if wasteReduction is true and daily logging exists, count as success
        if (
          criteria.wasteReduction &&
          dailyLogData.date &&
          dailyLogData.overrides?.lifestyle
        ) {
          const wasteManagement =
            dailyLogData.overrides.lifestyle.wasteManagement;
          if (
            wasteManagement === "basic_segregation" ||
            wasteManagement === "recycle_compost"
          ) {
            criteriaMetToday = true;
            progressIncrement = 1;
          }
        }

        // Check target reduction (optional for lifestyle challenges)
        if (
          criteria.targetReduction &&
          dailyLogData.calculatedDailyCarbonFootprint &&
          !criteriaMetToday // Only check if not already met
        ) {
          // Get user's baseline from profile instead of hardcoded 20
          const todayCarbon = dailyLogData.calculatedDailyCarbonFootprint;
          // For lifestyle challenges, accept if carbon footprint is reasonable (under 50)
          if (todayCarbon <= 50) {
            criteriaMetToday = true;
            progressIncrement = 1;
          }
        }
      }

      // Update challenge progress if criteria met
      if (criteriaMetToday) {
        const newProgress = challengeData.progress + progressIncrement;
        const challengeRef = db
          .collection("users")
          .doc(uid)
          .collection("challenges")
          .doc(challengeId);

        // Check if challenge is completed
        // For challenges without duration, assume single-day completion
        // For challenges with duration, use that value
        const targetProgress = challengeData.duration || 1;
        const isCompleted = newProgress >= targetProgress;

        const updateData = {
          progress: newProgress,
          updatedAt: new Date(),
          lastProgressDate: dailyLogData.date,
        };

        if (isCompleted) {
          updateData.isCompleted = true;
          updateData.completedAt = new Date();
          updateData.pointsEarned = pointsAwarded;
          updateData.badgeEarned = badgeAwarded;

          // Queue gamification update
          const gamificationRef = db
            .collection("users")
            .doc(uid)
            .collection("gamification")
            .doc("data");
          updates.push({
            type: "gamification",
            ref: gamificationRef,
            pointsAwarded,
            badgeAwarded,
          });
        }

        batch.update(challengeRef, updateData);
      }
    }

    // Commit all challenge updates
    await batch.commit();

    // Update gamification data
    for (const update of updates) {
      if (update.type === "gamification") {
        const gamificationDoc = await update.ref.get();
        if (gamificationDoc.exists) {
          const gamificationData = gamificationDoc.data();
          const currentPoints = gamificationData.ecoPoints || 0;
          const currentBadges = gamificationData.badges || [];

          const updatedData = {
            ecoPoints: currentPoints + update.pointsAwarded,
            level: Math.floor((currentPoints + update.pointsAwarded) / 100) + 1,
            totalChallengesCompleted:
              (gamificationData.totalChallengesCompleted || 0) + 1,
            updatedAt: new Date(),
          };

          // Add badge if it's new and doesn't already exist
          if (
            update.badgeAwarded &&
            !currentBadges.includes(update.badgeAwarded)
          ) {
            updatedData.badges = [...currentBadges, update.badgeAwarded];
          }

          await update.ref.update(updatedData);
        } else {
          // Create gamification profile if it doesn't exist
          await update.ref.set({
            ecoPoints: update.pointsAwarded,
            level: 1,
            badges: update.badgeAwarded ? [update.badgeAwarded] : [],
            totalChallengesCompleted: 1,
            streakDays: 1,
            createdAt: new Date(),
            lastUpdated: new Date(),
          });
        }
      }
    }

    return { success: true, updatesCount: updates.length };
  } catch (err) {
    console.error("Error updating challenge progress:", err);
    return { success: false, error: err.message };
  }
};

// Get detailed challenge progress and statistics
export const getChallengeStats = async (req, res) => {
  const { uid } = req.user;

  try {
    // Get all user challenges
    const challengesSnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("challenges")
      .get();

    // Get gamification data
    const gamificationDoc = await db
      .collection("users")
      .doc(uid)
      .collection("gamification")
      .doc("data")
      .get();

    const gamificationData = gamificationDoc.exists
      ? gamificationDoc.data()
      : {
          ecoPoints: 0,
          level: 1,
          badges: [],
          totalChallengesCompleted: 0,
        };

    const challenges = [];
    let totalPointsEarned = 0;
    let completedCount = 0;
    let activeCount = 0;

    challengesSnapshot.forEach((doc) => {
      const challengeData = { id: doc.id, ...doc.data() };
      challenges.push(challengeData);

      if (challengeData.isCompleted) {
        completedCount++;
        totalPointsEarned += challengeData.pointsEarned || 0;
      } else {
        activeCount++;
      }
    });

    // Calculate completion rate
    const totalChallenges = challenges.length;
    const completionRate =
      totalChallenges > 0
        ? ((completedCount / totalChallenges) * 100).toFixed(1)
        : 0;

    // Get recent achievements (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentAchievements = challenges.filter(
      (challenge) =>
        challenge.isCompleted &&
        challenge.completedAt &&
        new Date(
          challenge.completedAt.toDate
            ? challenge.completedAt.toDate()
            : challenge.completedAt
        ) > sevenDaysAgo
    );

    res.status(200).json({
      message: "Challenge statistics retrieved successfully",
      stats: {
        totalChallenges,
        completedChallenges: completedCount,
        activeChallenges: activeCount,
        completionRate: `${completionRate}%`,
        totalPointsFromChallenges: totalPointsEarned,
        recentAchievements: recentAchievements.length,
      },
      gamification: {
        currentPoints: gamificationData.ecoPoints,
        currentLevel: gamificationData.level,
        totalBadges: gamificationData.badges.length,
        badges: gamificationData.badges,
        totalCompletedChallenges:
          gamificationData.totalChallengesCompleted || 0,
      },
      recentAchievements: recentAchievements.map((achievement) => ({
        name: achievement.challengeName,
        completedAt: achievement.completedAt,
        pointsEarned: achievement.pointsEarned,
        badgeEarned: achievement.badgeEarned,
        type: achievement.challengeType,
      })),
    });
  } catch (error) {
    console.error("Error getting challenge stats:", error);
    res.status(500).json({
      error: "Failed to get challenge statistics",
      details: error.message,
    });
  }
};

// Get detailed progress for a specific challenge
export const getChallengeProgress = async (req, res) => {
  const { uid } = req.user;
  const { challengeId } = req.params;

  try {
    const challengeDoc = await db
      .collection("users")
      .doc(uid)
      .collection("challenges")
      .doc(challengeId)
      .get();

    if (!challengeDoc.exists) {
      return res.status(404).json({
        message: "Challenge not found or user not participating",
      });
    }

    const challengeData = challengeDoc.data();
    const targetProgress = challengeData.duration || 7;
    const currentProgress = challengeData.progress || 0;
    const progressPercentage = (
      (currentProgress / targetProgress) *
      100
    ).toFixed(1);

    // Calculate days remaining
    const endDate = challengeData.endDate?.toDate
      ? challengeData.endDate.toDate()
      : new Date(challengeData.endDate);
    const today = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil((endDate - today) / (1000 * 60 * 60 * 24))
    );

    // Get recent progress (daily progress tracking)
    const dailyLogsSnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("dailyLogs")
      .where(
        "date",
        ">=",
        challengeData.joinedAt?.toDate
          ? challengeData.joinedAt.toDate().toISOString().split("T")[0]
          : challengeData.joinedAt.split("T")[0]
      )
      .orderBy("date", "desc")
      .limit(7)
      .get();

    const recentProgress = [];
    dailyLogsSnapshot.forEach((doc) => {
      recentProgress.push({
        date: doc.data().date,
        contributed: true, // You could add logic to check if this log contributed to challenge progress
      });
    });

    res.status(200).json({
      message: "Challenge progress retrieved successfully",
      challenge: {
        id: challengeDoc.id,
        name: challengeData.challengeName,
        description: challengeData.description,
        type: challengeData.challengeType,
        difficulty: challengeData.difficulty,
        isCompleted: challengeData.isCompleted,
        completedAt: challengeData.completedAt,
        joinedAt: challengeData.joinedAt,
        endDate: challengeData.endDate,
      },
      progress: {
        current: currentProgress,
        target: targetProgress,
        percentage: `${progressPercentage}%`,
        daysRemaining,
        lastProgressDate: challengeData.lastProgressDate,
      },
      rewards: {
        pointsAwarded: challengeData.pointsAwarded,
        badgeAwarded: challengeData.badgeAwarded,
        pointsEarned: challengeData.pointsEarned || 0,
        badgeEarned: challengeData.badgeEarned || null,
      },
      criteria: challengeData.criteria,
      recentActivity: recentProgress,
    });
  } catch (error) {
    console.error("Error getting challenge progress:", error);
    res.status(500).json({
      error: "Failed to get challenge progress",
      details: error.message,
    });
  }
};

// Get all available badges and user's earned badges
export const getBadgesInfo = async (req, res) => {
  const { uid } = req.user;

  try {
    // Get all available challenges to see all possible badges
    const allChallengesSnapshot = await db.collection("challenges").get();
    const availableBadges = [];

    allChallengesSnapshot.forEach((doc) => {
      const challengeData = doc.data();
      if (challengeData.badgeAwarded) {
        availableBadges.push({
          name: challengeData.badgeAwarded,
          challengeName: challengeData.name,
          challengeType: challengeData.type,
          difficulty: challengeData.difficulty,
          pointsRequired: challengeData.pointsAwarded,
        });
      }
    });

    // Get user's earned badges
    const gamificationDoc = await db
      .collection("users")
      .doc(uid)
      .collection("gamification")
      .doc("data")
      .get();

    const earnedBadges = gamificationDoc.exists
      ? gamificationDoc.data().badges || []
      : [];

    // Get user's completed challenges for badge details
    const completedChallengesSnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("challenges")
      .where("isCompleted", "==", true)
      .get();

    const earnedBadgeDetails = [];
    completedChallengesSnapshot.forEach((doc) => {
      const challengeData = doc.data();
      if (challengeData.badgeEarned) {
        earnedBadgeDetails.push({
          name: challengeData.badgeEarned,
          challengeName: challengeData.challengeName,
          earnedAt: challengeData.completedAt,
          pointsEarned: challengeData.pointsEarned,
          challengeType: challengeData.challengeType,
        });
      }
    });

    res.status(200).json({
      message: "Badges information retrieved successfully",
      summary: {
        totalAvailableBadges: availableBadges.length,
        earnedBadges: earnedBadges.length,
        completionRate:
          availableBadges.length > 0
            ? `${((earnedBadges.length / availableBadges.length) * 100).toFixed(
                1
              )}%`
            : "0%",
      },
      availableBadges,
      earnedBadges: earnedBadgeDetails,
      unearnedBadges: availableBadges.filter(
        (badge) => !earnedBadges.includes(badge.name)
      ),
    });
  } catch (error) {
    console.error("Error getting badges info:", error);
    res.status(500).json({
      error: "Failed to get badges information",
      details: error.message,
    });
  }
};

// Seed default challenges for the system
export const seedDefaultChallenges = async (req, res) => {
  try {
    const defaultChallenges = [
      {
        challengeId: "meat_free_monday",
        name: "Meat-Free Monday",
        description: "Go vegetarian or vegan for a day!",
        type: "diet",
        difficulty: "easy",
        duration: 1,
        pointsAwarded: 20,
        badgeAwarded: "Meat-Free Master",
        criteria: {
          meatReduction: 0,
        },
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isPersonalized: false,
        createdAt: new Date(),
      },
      {
        challengeId: "public_transport_week",
        name: "Public Transport Week",
        description:
          "Use public transport, cycling, or walking for your daily commute for 5 days",
        type: "transport",
        difficulty: "medium",
        duration: 5,
        pointsAwarded: 40,
        badgeAwarded: "Eco Commuter",
        criteria: {
          publicTransport: true,
          carbonReduction: 20,
        },
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isPersonalized: false,
        createdAt: new Date(),
      },
      {
        challengeId: "energy_saver_challenge",
        name: "Energy Saver Challenge",
        description: "Reduce your electricity usage by 15% for one week",
        type: "electricity",
        difficulty: "medium",
        duration: 7,
        pointsAwarded: 35,
        badgeAwarded: "Energy Guardian",
        criteria: {
          electricityReduction: 15,
          mindfulUsage: true,
        },
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isPersonalized: false,
        createdAt: new Date(),
      },
      {
        challengeId: "zero_waste_warrior",
        name: "Zero Waste Warrior",
        description:
          "Practice zero waste living for 3 days - reduce, reuse, recycle everything",
        type: "lifestyle",
        difficulty: "hard",
        duration: 3,
        pointsAwarded: 50,
        badgeAwarded: "Zero Waste Champion",
        criteria: {
          wasteReduction: true,
          targetReduction: "10%",
        },
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isPersonalized: false,
        createdAt: new Date(),
      },
      {
        challengeId: "carbon_tracker_daily",
        name: "Daily Carbon Tracker",
        description: "Log your daily carbon footprint for 7 consecutive days",
        type: "lifestyle",
        difficulty: "easy",
        duration: 7,
        pointsAwarded: 25,
        badgeAwarded: "Data Detective",
        criteria: {
          dailyLogging: 7,
        },
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isPersonalized: false,
        createdAt: new Date(),
      },
    ];

    const batch = db.batch();

    for (const challenge of defaultChallenges) {
      const challengeRef = db
        .collection("challenges")
        .doc(challenge.challengeId);
      batch.set(challengeRef, challenge);
    }

    await batch.commit();

    res.status(200).json({
      message: "Default challenges seeded successfully",
      challengesCreated: defaultChallenges.length,
      challenges: defaultChallenges.map((c) => ({
        id: c.challengeId,
        name: c.name,
        type: c.type,
      })),
    });
  } catch (error) {
    console.error("Error seeding default challenges:", error);
    res.status(500).json({
      error: "Failed to seed default challenges",
      details: error.message,
    });
  }
};

// Create a new challenge (Admin only)
export const createChallenge = async (req, res) => {
  try {
    const { uid } = req.user;

    const {
      challengeId,
      name,
      description,
      type,
      difficulty = "medium",
      duration = 7,
      pointsAwarded,
      badgeAwarded,
      criteria,
      isActive = true,
    } = req.body;

    // Validate required fields
    if (
      !challengeId ||
      !name ||
      !description ||
      !type ||
      !pointsAwarded ||
      !badgeAwarded ||
      !criteria
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: challengeId, name, description, type, pointsAwarded, badgeAwarded, criteria",
      });
    }

    // Check if challenge already exists
    const existingChallenge = await db
      .collection("challenges")
      .doc(challengeId)
      .get();
    if (existingChallenge.exists) {
      return res.status(400).json({
        error: "Challenge with this ID already exists",
      });
    }

    // Validate challenge type
    const validTypes = ["diet", "transport", "electricity", "lifestyle"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error:
          "Invalid challenge type. Must be one of: diet, transport, electricity, lifestyle",
      });
    }

    // Validate difficulty
    const validDifficulties = ["easy", "medium", "hard"];
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({
        error: "Invalid difficulty level. Must be one of: easy, medium, hard",
      });
    }

    const newChallenge = {
      challengeId,
      name,
      description,
      type,
      difficulty,
      duration,
      pointsAwarded,
      badgeAwarded,
      criteria,
      isActive,
      startDate: new Date(),
      endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
      isPersonalized: false,
      createdAt: new Date(),
      createdBy: uid,
    };

    await db.collection("challenges").doc(challengeId).set(newChallenge);

    res.status(201).json({
      message: "Challenge created successfully",
      challenge: {
        id: challengeId,
        ...newChallenge,
      },
    });
  } catch (error) {
    console.error("Error creating challenge:", error);
    res.status(500).json({
      error: "Failed to create challenge",
      details: error.message,
    });
  }
};

// Update an existing challenge (Admin only)
export const updateChallenge = async (req, res) => {
  try {
    const { uid } = req.user;
    const { challengeId } = req.params;

    // Check if challenge exists
    const challengeRef = db.collection("challenges").doc(challengeId);
    const challengeDoc = await challengeRef.get();

    if (!challengeDoc.exists) {
      return res.status(404).json({
        error: "Challenge not found",
      });
    }

    const updateData = {};
    const allowedFields = [
      "name",
      "description",
      "type",
      "difficulty",
      "duration",
      "pointsAwarded",
      "badgeAwarded",
      "criteria",
      "isActive",
    ];

    // Only include fields that are provided in the request body
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Validate type if provided
    if (updateData.type) {
      const validTypes = ["diet", "transport", "electricity", "lifestyle"];
      if (!validTypes.includes(updateData.type)) {
        return res.status(400).json({
          error:
            "Invalid challenge type. Must be one of: diet, transport, electricity, lifestyle",
        });
      }
    }

    // Validate difficulty if provided
    if (updateData.difficulty) {
      const validDifficulties = ["easy", "medium", "hard"];
      if (!validDifficulties.includes(updateData.difficulty)) {
        return res.status(400).json({
          error: "Invalid difficulty level. Must be one of: easy, medium, hard",
        });
      }
    }

    // Update the endDate if duration is changed
    if (updateData.duration) {
      const currentChallenge = challengeDoc.data();
      const startDate = currentChallenge.startDate.toDate();
      updateData.endDate = new Date(
        startDate.getTime() + updateData.duration * 24 * 60 * 60 * 1000
      );
    }

    updateData.updatedAt = new Date();
    updateData.updatedBy = uid;

    await challengeRef.update(updateData);

    // Get the updated challenge
    const updatedChallengeDoc = await challengeRef.get();
    const updatedChallenge = {
      id: challengeId,
      ...updatedChallengeDoc.data(),
    };

    res.status(200).json({
      message: "Challenge updated successfully",
      challenge: updatedChallenge,
    });
  } catch (error) {
    console.error("Error updating challenge:", error);
    res.status(500).json({
      error: "Failed to update challenge",
      details: error.message,
    });
  }
};

// Delete a challenge (Admin only)
export const deleteChallenge = async (req, res) => {
  try {
    const { uid } = req.user;
    const { challengeId } = req.params;

    // Check if challenge exists
    const challengeRef = db.collection("challenges").doc(challengeId);
    const challengeDoc = await challengeRef.get();

    if (!challengeDoc.exists) {
      return res.status(404).json({
        error: "Challenge not found",
      });
    }

    const challengeData = challengeDoc.data();

    // Check if there are any active participants
    const usersSnapshot = await db
      .collectionGroup("challenges")
      .where("challengeId", "==", challengeId)
      .where("isCompleted", "==", false)
      .get();

    if (!usersSnapshot.empty) {
      return res.status(409).json({
        error:
          "Cannot delete challenge with active participants. Please wait for all participants to complete or leave the challenge.",
        activeParticipants: usersSnapshot.size,
      });
    }

    // Delete the challenge
    await challengeRef.delete();

    res.status(200).json({
      message: "Challenge deleted successfully",
      deletedChallenge: {
        challengeId,
        name: challengeData.name,
      },
    });
  } catch (error) {
    console.error("Error deleting challenge:", error);
    res.status(500).json({
      error: "Failed to delete challenge",
      details: error.message,
    });
  }
};
