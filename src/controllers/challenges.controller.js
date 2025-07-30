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
        generationMethod: challengeResult.fromCache ? 'cached' : 'ai-generated'
      }
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
        generationMethod: 'fallback',
        error: error.message
      }
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
        generationMethod: 'ai-generated-fresh',
        carbonFootprint: currentCarbonFootprint
      }
    });

  } catch (error) {
    console.error("Error refreshing challenges:", error);
    return res.status(500).json({
      error: "Failed to refresh challenges",
      details: error.message
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
        cacheEfficiency: stats.totalUsers > 0 ? 
          ((stats.totalUsers - stats.totalApiCalls) / stats.totalUsers * 100).toFixed(1) + '%' : 
          'N/A'
      }
    });
  } catch (error) {
    console.error("Error getting API stats:", error);
    return res.status(500).json({
      error: "Failed to get API usage statistics",
      details: error.message
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
    snapshot.forEach((doc) => {
      challenges.push({
        id: doc.id,
        ...doc.data(),
      });
    });

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

      // Enhanced criteria checking based on challenge type and new carbon logic
      if (type === "diet") {
        // Check diet-related criteria
        if (criteria.plantBasedMeals && dailyLogData.overrides?.diet) {
          // Check if user increased plant-based meals
          const plantIncrease =
            dailyLogData.overrides.diet.plantPercentage || 0;
          if (plantIncrease >= (criteria.meatReduction || 20)) {
            criteriaMetToday = true;
            progressIncrement = 1;
          }
        }

        if (criteria.meatReduction && dailyLogData.overrides?.diet) {
          const meatReduction = dailyLogData.overrides.diet.meatPercentage || 0;
          if (meatReduction <= criteria.meatReduction) {
            criteriaMetToday = true;
            progressIncrement = 1;
          }
        }
      }

      if (type === "transport") {
        // Check transport-related criteria
        if (criteria.publicTransport && dailyLogData.overrides?.transport) {
          const transportMode = dailyLogData.overrides.transport.primaryMode;
          if (
            ["bus", "metro_train", "bicycle", "walking"].includes(transportMode)
          ) {
            criteriaMetToday = true;
            progressIncrement = 1;
          }
        }

        if (criteria.carbonReduction && dailyLogData.carbonBreakdown) {
          const transportCarbon = dailyLogData.carbonBreakdown.transport || 0;
          const baselineTransport = 8; // Default baseline, should get from user profile
          const reduction =
            ((baselineTransport - transportCarbon) / baselineTransport) * 100;
          if (reduction >= (criteria.carbonReduction || 10)) {
            criteriaMetToday = true;
            progressIncrement = 1;
          }
        }
      }

      if (type === "electricity") {
        // Check electricity-related criteria
        if (criteria.electricityReduction && dailyLogData.carbonBreakdown) {
          const electricityCarbon =
            dailyLogData.carbonBreakdown.electricity || 0;
          const baselineElectricity = 4; // Default baseline, should get from user profile
          const reduction =
            ((baselineElectricity - electricityCarbon) / baselineElectricity) *
            100;
          if (reduction >= (criteria.electricityReduction || 15)) {
            criteriaMetToday = true;
            progressIncrement = 1;
          }
        }

        if (criteria.mindfulUsage && dailyLogData.overrides?.electricity) {
          // Check if user made conscious electricity choices
          const applianceReduction =
            dailyLogData.overrides.electricity.appliances;
          if (applianceReduction && applianceReduction.length < 3) {
            criteriaMetToday = true;
            progressIncrement = 1;
          }
        }
      }

      if (type === "lifestyle") {
        // Check lifestyle-related criteria
        if (criteria.dailyLogging && dailyLogData.date) {
          criteriaMetToday = true;
          progressIncrement = 1;
        }

        if (
          criteria.targetReduction &&
          dailyLogData.calculatedDailyCarbonFootprint
        ) {
          const baselineCarbon = 20; // Should get from user profile
          const todayCarbon = dailyLogData.calculatedDailyCarbonFootprint;
          const reduction =
            ((baselineCarbon - todayCarbon) / baselineCarbon) * 100;
          const targetReduction = parseInt(
            criteria.targetReduction.replace("%", "")
          );
          if (reduction >= targetReduction) {
            criteriaMetToday = true;
            progressIncrement = 1;
          }
        }

        if (criteria.wasteReduction && dailyLogData.overrides?.lifestyle) {
          const wasteManagement =
            dailyLogData.overrides.lifestyle.wasteManagement;
          if (wasteManagement === "recycle_compost") {
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

        // Check if challenge is completed (7 days for weekly challenges)
        const targetProgress = challengeData.duration || 7;
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
