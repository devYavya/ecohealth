import { admin } from "../config/firebase.js";
import {
  calculateCarbonFootprint,
  calculateCarbonCategory,
  generateRecommendations,
} from "../utils/carbonLogic.js";

const FieldValue = admin.firestore.FieldValue;

// Comprehensive Onboarding Questions based on 4 profiles
export const getOnboardingQuestions = async (req, res) => {
  try {
    const questions = {
      transport: [
        {
          id: "transport_1",
          question: "What is your primary mode of daily commute?",
          field: "primaryMode",
          type: "single_choice",
          options: [
            { value: "personal_car", label: "Personal Car", icon: "🚗" },
            {
              value: "two_wheeler",
              label: "Two-wheeler (bike/scooter)",
              icon: "🏍️",
            },
            { value: "bus", label: "Bus", icon: "🚌" },
            { value: "metro_train", label: "Metro/Train", icon: "🚇" },
            { value: "bicycle", label: "Bicycle", icon: "🚲" },
            { value: "walking", label: "Walking", icon: "🚶" },
            { value: "work_from_home", label: "I work from home", icon: "🏠" },
          ],
        },
        {
          id: "transport_2",
          question: "What type of fuel does your main vehicle use?",
          field: "fuelType",
          type: "single_choice",
          condition: {
            field: "primaryMode",
            values: ["personal_car", "two_wheeler"],
          },
          options: [
            { value: "petrol", label: "Petrol", icon: "⛽" },
            { value: "diesel", label: "Diesel", icon: "🛢️" },
            { value: "cng", label: "CNG", icon: "🔥" },
            { value: "electric", label: "Electric (EV)", icon: "⚡" },
            { value: "hybrid", label: "Hybrid", icon: "🔋" },
          ],
        },
        {
          id: "transport_3",
          question: "How do you usually charge your EV?",
          field: "evChargingSource",
          type: "single_choice",
          condition: { field: "fuelType", values: ["electric"] },
          options: [
            {
              value: "home_grid",
              label: "At home (grid electricity)",
              icon: "🏠",
            },
            {
              value: "public_stations",
              label: "At public charging stations",
              icon: "🔌",
            },
            {
              value: "renewable",
              label: "Mostly with solar/renewable source",
              icon: "☀️",
            },
          ],
        },
        {
          id: "transport_4",
          question: "On average, how far do you travel per day (total)?",
          field: "dailyDistance",
          type: "single_choice",
          options: [
            { value: "0_5km", label: "0–5 km", icon: "📍" },
            { value: "6_15km", label: "6–15 km", icon: "📍" },
            { value: "16_30km", label: "16–30 km", icon: "📍" },
            { value: "31_50km", label: "31–50 km", icon: "📍" },
            { value: "51plus_km", label: "51+ km", icon: "📍" },
          ],
        },
        {
          id: "transport_5",
          question: "What is your vehicle’s approximate mileage (if known)?",
          field: "mileage",
          type: "single_choice",
          condition: {
            field: "primaryMode",
            values: ["personal_car", "two_wheeler"],
          },
          options: [
            { value: "low", label: "<10 km/l (low)", icon: "📉" },
            { value: "average", label: "10–15 km/l (average)", icon: "📊" },
            { value: "good", label: "16–25 km/l (good)", icon: "📈" },
            { value: "excellent", label: "25+ km/l or EV", icon: "⚡" },
          ],
        },
        {
          id: "transport_6",
          question: "Approximately how many flights do you take per year?",
          field: "flightsPerYear",
          type: "multi_input",
          description: "Enter number of flights by category and class.",
          categories: [
            { name: "Short Haul (1–3 hrs)", field: "shortHaul" },
            { name: "Medium Haul (4–7 hrs)", field: "mediumHaul" },
            { name: "Long Haul (8+ hrs)", field: "longHaul" },
          ],
          classes: ["Economy", "Premium Economy", "Business", "First"],
        },
      ],

      diet: [
        {
          id: "diet_1",
          question: "What best describes your diet?",
          field: "dietType",
          type: "single_choice",
          options: [
            { value: "vegan", label: "Vegan 🌱" },
            { value: "vegetarian", label: "Vegetarian 🥗" },
            { value: "pescetarian", label: "Pescetarian (Fish eater) 🐟" },
            { value: "non_veg_no_beef", label: "Non-veg (but no beef) 🍗" },
            {
              value: "non_veg_with_beef",
              label: "Non-veg (including beef) 🥩",
            },
          ],
        },
        {
          id: "diet_2",
          question: "On average, how many meals do you eat per day?",
          field: "mealsPerDay",
          type: "single_choice",
          options: [
            { value: 1, label: "1 🍽️" },
            { value: 2, label: "2 🍽️🍽️" },
            { value: 3, label: "3 🍽️🍽️🍽️" },
            { value: 4, label: "4+ 🍽️+" },
          ],
        },
      ],

      electricity: [
        {
          id: "electricity_1",
          question: "What is your average monthly electricity usage (kWh)?",
          field: "monthlyKwh",
          type: "number_input",
          placeholder: "Enter kWh (check your electricity bill)",
          min: 0,
          max: 2000,
        },
        {
          id: "electricity_2",
          question: "How many people live in your household (including you)?",
          field: "householdSize",
          type: "number_input",
          min: 1,
          max: 20,
        },
      ],

      lifestyle: [
        {
          id: "lifestyle_1",
          question:
            "How often do you shop for non-essential items (gadgets, fashion, gifts)?",
          field: "nonEssentialShopping",
          type: "single_choice",
          options: [
            { value: "weekly", label: "Weekly 🛍️" },
            { value: "few_times_month", label: "Few times a month 🛒" },
            { value: "monthly", label: "Once a month 📅" },
            { value: "rarely_never", label: "Rarely/Never 🚫" },
          ],
        },
        {
          id: "lifestyle_2",
          question:
            "How often do you buy clothes, shoes, or fashion accessories?",
          field: "fashionShopping",
          type: "single_choice",
          options: [
            { value: "more_once_month", label: "More than once a month 👗" },
            { value: "every_1_2_months", label: "Once every 1–2 months 👕" },
            { value: "every_3plus_months", label: "Once every 3+ months 👖" },
            { value: "rarely_never", label: "Rarely/Never 🚫" },
          ],
        },
        {
          id: "lifestyle_3",
          question: "How do you manage household waste?",
          field: "wasteManagement",
          type: "single_choice",
          options: [
            {
              value: "recycle_compost",
              label: "Mostly recycle and compost ♻️",
            },
            { value: "recycle_some", label: "Recycle some, throw some 🗂️" },
            {
              value: "throw_everything",
              label: "Throw everything together 🗑️",
            },
          ],
        },
      ],
    };

    return res.status(200).json({
      questions,
      totalQuestions: Object.values(questions).flat().length,
      message: "EcoCue onboarding questions retrieved successfully",
    });
  } catch (error) {
    console.error("getOnboardingQuestions error:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch onboarding questions." });
  }
};

// Validate onboarding responses for new structure
const validateOnboardingData = (onboardingData) => {
  const requiredFields = {
    transport: ["primaryMode", "dailyDistance", "passengers", "flightsPerYear"],
    diet: [
      "mealsPerDay",
      "meatPercentage",
      "dairyPercentage",
      "plantPercentage",
      "orderedMealsFreq",
      "junkFoodFreq",
      "foodWaste",
    ],
    electricity: [
      "householdSize",
      "timeAtHome",
      "appliances",
      "renewableEnergy",
    ],
    lifestyle: [
      "screenTime",
      "nonEssentialShopping",
      "fashionShopping",
      "onlineOrders",
      "wasteManagement",
    ],
  };

  // Check if we have monthly kWh or estimate
  const hasElectricityUsage =
    onboardingData.monthlyKwh || onboardingData.monthlyKwhEstimate;
  if (!hasElectricityUsage) {
    requiredFields.electricity.push("monthlyKwhEstimate");
  }

  // Check conditional fields
  if (["personal_car", "two_wheeler"].includes(onboardingData.primaryMode)) {
    requiredFields.transport.push("fuelType");
    if (onboardingData.fuelType === "electric") {
      requiredFields.transport.push("evChargingSource");
    }
  }

  const missingFields = [];
  for (const [category, fields] of Object.entries(requiredFields)) {
    for (const field of fields) {
      if (!onboardingData[field] && onboardingData[field] !== 0) {
        missingFields.push(`${category}.${field}`);
      }
    }
  }

  if (missingFields.length > 0) {
    return {
      isValid: false,
      missingFields,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    };
  }

  // Validate diet percentages add up to 100%
  const totalDietPercentage =
    (onboardingData.meatPercentage || 0) +
    (onboardingData.dairyPercentage || 0) +
    (onboardingData.plantPercentage || 0);

  if (Math.abs(totalDietPercentage - 100) > 5) {
    // Allow 5% tolerance
    return {
      isValid: false,
      message: "Diet percentages must add up to approximately 100%",
    };
  }

  return { isValid: true };
};

export const submitOnboarding = async (req, res) => {
  try {
    const uid = req.user.uid;
    const onboardingData = req.body;

    if (typeof onboardingData !== "object" || Array.isArray(onboardingData)) {
      return res.status(400).json({ error: "Invalid onboarding data format" });
    }

    // 🧠 Prepare structured onboarding profile
    const profileData = {
      transport: {
        primaryMode: onboardingData.primaryMode,
        fuelType: onboardingData.fuelType,
        evChargingSource: onboardingData.evChargingSource,
        dailyDistance: onboardingData.dailyDistance,
        mileage: onboardingData.mileage,
        flightsPerYear: onboardingData.flightsPerYear || {}, // short, medium, long
      },
      diet: {
        dietType: onboardingData.dietType,
        mealsPerDay: onboardingData.mealsPerDay,
      },
      electricity: {
        monthlyKwh: onboardingData.monthlyKwh,
        householdSize: onboardingData.householdSize,
        country: onboardingData.country || "India",
      },
      lifestyle: {
        nonEssentialShopping: onboardingData.nonEssentialShopping,
        fashionShopping: onboardingData.fashionShopping,
        wasteManagement: onboardingData.wasteManagement,
      },
    };

    // 🔹 Sanitize Firestore input
    const sanitizeForFirestore = (obj) => {
      const clean = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v !== undefined && v !== null) {
          clean[k] =
            typeof v === "object" && !Array.isArray(v)
              ? sanitizeForFirestore(v)
              : v;
        }
      }
      return clean;
    };

    const sanitizedProfile = sanitizeForFirestore(profileData);

    // 🔥 Save onboarding profile
    const onboardingRef = admin
      .firestore()
      .doc(`users/${uid}/onboardingProfile/data`);
    await onboardingRef.set({
      ...sanitizedProfile,
      completedAt: FieldValue.serverTimestamp(),
      version: "3.1", // minor version bump
    });

    // ✅ Fetch emission factors from Firestore
    const db = admin.firestore();

    // 1️⃣ Flight emissions
    const flightRef = db.collection("flight_emissions");
    const flightSnap = await flightRef.get();
    const flightFactors = {};
    flightSnap.forEach((doc) => (flightFactors[doc.id] = doc.data()));

    // 2️⃣ Electricity emissions
    const countryRef = db
      .collection("electricity_emissions")
      .doc(profileData.electricity.country);
    const countryDoc = await countryRef.get();
    const electricityFactor = countryDoc.exists
      ? countryDoc.data().factor
      : 0.4;

    // 3️⃣ Food emissions
    const foodRef = db
      .collection("food_emission_factors")
      .doc(profileData.diet.dietType || "average");
    const foodDoc = await foodRef.get();
    const foodFactor = foodDoc.exists ? foodDoc.data().factor : 2.0; // fallback

    // 🌍 Calculate Carbon Footprint
    const breakdown = {};

    // ✈️ Flights
    let flightTotal = 0;
    const { flightsPerYear } = profileData.transport;
    for (const [range, data] of Object.entries(flightsPerYear || {})) {
      const classType = data.class || "Economy";
      const count = parseFloat(data.count || 0);
      const factor =
        flightFactors[range]?.classes?.[classType]?.finalFactor || 0;
      flightTotal += (count * factor) / 365; // per day
    }
    breakdown.flights = flightTotal;

    // 🚗 Transport
    const transportDistanceMap = {
      "0_5km": 2.5,
      "6_15km": 10,
      "16_30km": 23,
      "31_50km": 40,
      "51plus_km": 60,
    };
    const distance =
      transportDistanceMap[profileData.transport.dailyDistance] || 10;
    let transportFactor = 0.2;
    if (profileData.transport.fuelType === "diesel") transportFactor = 0.27;
    if (profileData.transport.fuelType === "petrol") transportFactor = 0.24;
    if (profileData.transport.fuelType === "electric") transportFactor = 0.08;
    breakdown.transport = distance * transportFactor;

    // 🍽️ Diet
    const dietMap = {
      vegan: 2.0,
      vegetarian: 2.5,
      pescetarian: 3.0,
      non_veg_no_beef: 3.5,
      non_veg_with_beef: 5.0,
    };
    breakdown.diet = dietMap[profileData.diet.dietType] || foodFactor;

    // ⚡ Electricity
    const kwh = profileData.electricity.monthlyKwh || 300;
    const people = profileData.electricity.householdSize || 3;
    const dailyElectricity = kwh / people / 30;
    breakdown.electricity = dailyElectricity * electricityFactor;

    // 🧭 No lifestyle emissions yet
    breakdown.lifestyle = 0; // placeholder for future integration

    // 🌍 Total carbon
    const total = Object.values(breakdown).reduce((a, b) => a + b, 0);

    const carbonData = {
      totalCarbonFootprint: total,
      breakdown,
      unit: "kg CO2e per day",
      category: calculateCarbonCategory(total),
      calculatedAt: FieldValue.serverTimestamp(),
    };

    // Save carbon profile
    const carbonRef = db.doc(`users/${uid}/carbonProfile/baseline`);
    await carbonRef.set(carbonData);

    // 🎮 Gamification (same logic)
    const gamificationRef = db.doc(`users/${uid}/gamification/data`);
    const gamificationDoc = await gamificationRef.get();

    if (!gamificationDoc.exists) {
      await gamificationRef.set({
        ecoPoints: 50,
        onboardingBonus: 50,
        level: 1,
        totalChallengesCompleted: 0,
        createdAt: FieldValue.serverTimestamp(),
        lastUpdated: FieldValue.serverTimestamp(),
      });
    } else {
      const existing = gamificationDoc.data();
      if (!existing.onboardingBonus) {
        await gamificationRef.update({
          ecoPoints: FieldValue.increment(50),
          onboardingBonus: 50,
          lastUpdated: FieldValue.serverTimestamp(),
        });
      }
    }

    return res.status(200).json({
      message: "EcoCue onboarding completed successfully!",
      carbonData,
      gamificationBonus: 50,
      recommendations: generateRecommendations(profileData, total),
    });
  } catch (error) {
    console.error("submitOnboarding error:", error);
    return res.status(500).json({
      error: "Failed to save onboarding data.",
      details: error.message,
    });
  }
};

// Helper function to categorize carbon footprint
const getCarbonCategory = (carbonFootprint) => {
  if (carbonFootprint < 10) return "Low Impact";
  if (carbonFootprint < 20) return "Moderate Impact";
  if (carbonFootprint < 30) return "High Impact";
  return "Very High Impact";
};

// Helper function to generate personalized recommendations
// const generateRecommendations = (profileData, carbonFootprint) => {
//   const recommendations = [];

//   // Transport recommendations
//   if (profileData.transport.primaryMode === "personal_car") {
//     recommendations.push({
//       category: "Transportation",
//       suggestion:
//         "Consider using public transport or carpooling 2-3 days per week",
//       potentialSaving: "3-5 kg CO2e per day",
//     });
//   }

//   // Diet recommendations
//   if ((profileData.diet.meatPercentage || 0) > 50) {
//     recommendations.push({
//       category: "Diet",
//       suggestion:
//         "Try reducing meat consumption by 20-30% and increase plant-based meals",
//       potentialSaving: "1-3 kg CO2e per day",
//     });
//   }

//   // Electricity recommendations
//   if (profileData.electricity.appliances?.includes("air_conditioner")) {
//     recommendations.push({
//       category: "Energy",
//       suggestion:
//         "Set AC temperature to 24°C and use fans to supplement cooling",
//       potentialSaving: "1-2 kg CO2e per day",
//     });
//   }

//   // Lifestyle recommendations
//   if (profileData.lifestyle.wasteManagement === "throw_everything") {
//     recommendations.push({
//       category: "Waste",
//       suggestion:
//         "Start with basic waste segregation - separate dry and wet waste",
//       potentialSaving: "0.5-1 kg CO2e per day",
//     });
//   }

//   return recommendations.slice(0, 3); // Return top 3 recommendations
// };

// Get onboarding progress
export const getOnboardingProgress = async (req, res) => {
  try {
    const uid = req.user.uid;

    const onboardingRef = admin
      .firestore()
      .doc(`users/${uid}/onboardingProfile/data`);
    const onboardingDoc = await onboardingRef.get();

    if (!onboardingDoc.exists) {
      return res.status(200).json({
        isCompleted: false,
        progress: 0,
        totalQuestions: 25, // Updated total for new structure
        completedQuestions: 0,
        nextQuestion: 1,
      });
    }

    const onboardingData = onboardingDoc.data();

    // Check completion based on new structure
    const requiredSections = ["transport", "diet", "electricity", "lifestyle"];
    const completedSections = requiredSections.filter(
      (section) =>
        onboardingData[section] &&
        Object.keys(onboardingData[section]).length > 0
    );

    const completedQuestions = completedSections.length * 6; // Approximate
    const totalQuestions = 25;
    const progress = Math.round((completedQuestions / totalQuestions) * 100);
    const isCompleted = completedSections.length === requiredSections.length;

    return res.status(200).json({
      isCompleted,
      progress,
      totalQuestions,
      completedQuestions,
      nextQuestion: isCompleted ? null : completedSections.length + 1,
      completedSections,
      lastUpdated: onboardingData.completedAt || onboardingData.lastUpdated,
    });
  } catch (error) {
    console.error("getOnboardingProgress error:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch onboarding progress." });
  }
};

export const getDashboardData = async (req, res) => {
  try {
    const uid = req.user.uid;

    const userRef = admin.firestore().doc(`users/${uid}`);
    const gamificationRef = admin
      .firestore()
      .doc(`users/${uid}/gamification/data`);
    const carbonRef = admin
      .firestore()
      .doc(`users/${uid}/carbonProfile/baseline`);

    const [userDoc, gamificationDoc, carbonDoc] = await Promise.all([
      userRef.get(),
      gamificationRef.get(),
      carbonRef.get(),
    ]);

    // Get current gamification data
    let gamificationData = gamificationDoc.exists
      ? gamificationDoc.data()
      : {
          ecoPoints: 0,
          level: 1,
          badges: [],
          totalChallengesCompleted: 0,
        };

    // Validate streak continuity but be less aggressive about breaking streaks
    if (
      gamificationData.dailyLogStreak > 0 &&
      gamificationData.lastDailyLogDate
    ) {
      const lastDate = new Date(gamificationData.lastDailyLogDate);
      const today = new Date();
      const daysSinceLastLog = Math.floor(
        (today - lastDate) / (1000 * 60 * 60 * 24)
      );

      // Only break streaks if they're really stale (more than 2 days)
      // Let the daily logs controller handle 1-day gaps naturally
      if (daysSinceLastLog > 2) {
        // Streak is very stale - reset it
        console.log(
          `💔 Streak very stale for user ${uid} (${daysSinceLastLog} days since last log). Resetting streak.`
        );

        // Save the previous best streak if it was better
        let updateFields = {
          dailyLogStreak: 0,
          lastDailyLogDate: null,
          streakStartDate: null,
        };

        if (
          gamificationData.dailyLogStreak >
          (gamificationData.previousBestStreak || 0)
        ) {
          updateFields.previousBestStreak = gamificationData.dailyLogStreak;
          console.log(
            `🏆 Saved new personal best: ${gamificationData.dailyLogStreak} days`
          );
        }

        await gamificationRef.update(updateFields);

        // Update our local data
        gamificationData.dailyLogStreak = 0;
        gamificationData.lastDailyLogDate = null;
        gamificationData.streakStartDate = null;
        if (updateFields.previousBestStreak) {
          gamificationData.previousBestStreak = updateFields.previousBestStreak;
        }
      } else if (
        !gamificationData.streakStartDate &&
        gamificationData.dailyLogStreak > 0
      ) {
        // Backfill start date for existing streaks
        const startDate = new Date(lastDate);
        startDate.setDate(
          startDate.getDate() - (gamificationData.dailyLogStreak - 1)
        );
        const calculatedStartDate = startDate.toISOString().split("T")[0];

        // Update the database with calculated start date
        await gamificationRef.update({
          streakStartDate: calculatedStartDate,
        });

        // Update our local data
        gamificationData.streakStartDate = calculatedStartDate;
        console.log(
          `📅 Backfilled streak start date for user ${uid}: ${calculatedStartDate} (${gamificationData.dailyLogStreak} day streak)`
        );
      }
    }

    // Get recent challenge completions for updated points calculation
    const challengesCollection = admin
      .firestore()
      .collection("users")
      .doc(uid)
      .collection("challenges");

    // Get completed challenges
    const completedChallengesSnapshot = await challengesCollection
      .where("isCompleted", "==", true)
      .get();

    // Get active challenges
    const activeChallengesSnapshot = await challengesCollection
      .where("isCompleted", "==", false)
      .get();

    // Calculate total points from completed challenges
    let totalChallengePoints = 0;
    const recentCompletedChallenges = [];

    completedChallengesSnapshot.forEach((doc) => {
      const challengeData = doc.data();
      if (challengeData.pointsEarned) {
        totalChallengePoints += challengeData.pointsEarned;
      }
      recentCompletedChallenges.push({
        id: doc.id,
        name: challengeData.challengeName,
        pointsEarned: challengeData.pointsEarned || 0,
        completedAt: challengeData.completedAt,
        badgeEarned: challengeData.badgeEarned,
      });
    });

    // gamificationData is already defined above with backfill logic

    // Calculate updated eco points including challenge rewards
    const baseEcoPoints = gamificationData.ecoPoints || 0;
    const updatedEcoPoints = baseEcoPoints; // Challenges already add points to gamification

    // Calculate current level based on total points
    const currentLevel = Math.floor(updatedEcoPoints / 100) + 1;

    const dashboardData = {
      name: userDoc.exists ? userDoc.data().name : null,
      profilePictureUrl: userDoc.exists
        ? userDoc.data().profilePictureUrl
        : null,
      ecoPoints: updatedEcoPoints,
      level: currentLevel,
      badges: gamificationData.badges || [],
      baselineCarbonFootprint: carbonDoc.exists ? carbonDoc.data() : null,

      // Enhanced dashboard data
      challengeStats: {
        totalCompleted: recentCompletedChallenges.length,
        totalActive: activeChallengesSnapshot.size,
        totalPointsFromChallenges: totalChallengePoints,
        recentCompletions: recentCompletedChallenges
          .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
          .slice(0, 5), // Last 5 completed
      },

      // Points breakdown
      pointsBreakdown: {
        total: updatedEcoPoints,
        fromChallenges: totalChallengePoints,
        fromOnboarding: 50, // Onboarding bonus
        fromDailyLogs: Math.max(
          0,
          updatedEcoPoints - totalChallengePoints - 50
        ),
      },

      // Current streak and level info (with intelligent validation)
      streakInfo: {
        count: gamificationData.dailyLogStreak || 0,
        lastDate: gamificationData.lastDailyLogDate || null,
        startDate: gamificationData.streakStartDate || null,
        previousBestStreak: gamificationData.previousBestStreak || 0,
        streakBadges: gamificationData.streakBadges || [],
        // Streak is valid if: no streak (0) OR last log was within 2 days
        isValid:
          gamificationData.dailyLogStreak === 0 ||
          (gamificationData.lastDailyLogDate &&
            Math.floor(
              (new Date() - new Date(gamificationData.lastDailyLogDate)) /
                (1000 * 60 * 60 * 24)
            ) <= 2),
      },
      levelProgress: {
        currentLevel: currentLevel,
        pointsInCurrentLevel: updatedEcoPoints % 100,
        pointsToNextLevel: 100 - (updatedEcoPoints % 100),
        totalPointsForNextLevel: currentLevel * 100,
      },

      // Additional active challenges info
      activeChallenges: [],
    };

    // Add active challenges details
    activeChallengesSnapshot.forEach((doc) => {
      const challengeData = doc.data();
      dashboardData.activeChallenges.push({
        id: doc.id,
        name: challengeData.challengeName,
        type: challengeData.challengeType,
        progress: challengeData.progress || 0,
        duration: challengeData.duration || 1,
        pointsReward: challengeData.pointsReward || 0,
        badgeReward: challengeData.badgeReward,
        lastProgressDate: challengeData.lastProgressDate,
      });
    });

    return res.status(200).json({
      message: "Dashboard data retrieved successfully",
      dashboardData,
    });
  } catch (error) {
    console.error("getDashboardData error:", error);
    return res.status(500).json({ error: "Failed to fetch dashboard data." });
  }
};
