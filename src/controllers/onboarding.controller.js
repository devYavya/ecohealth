import { admin } from "../config/firebase.js";
import { calculateCarbonFootprint } from "../utils/carbonLogic.js";

const FieldValue = admin.firestore.FieldValue;

// 15 Onboarding Questions with options
export const getOnboardingQuestions = async (req, res) => {
  try {
    const questions = [
      {
        id: 1,
        question:
          "What is your primary mode of transportation for daily commute?",
        field: "primaryTransport",
        type: "single_choice",
        options: [
          { value: "car_daily", label: "Personal Car (Daily)", icon: "🚗" },
          {
            value: "public_transport",
            label: "Public Transport (Bus/Metro)",
            icon: "🚌",
          },
          { value: "bike_scooter", label: "Bike/Scooter", icon: "🏍️" },
          { value: "walking", label: "Walking", icon: "🚶" },
          { value: "electric_vehicle", label: "Electric Vehicle", icon: "⚡" },
          { value: "work_from_home", label: "Work from Home", icon: "🏠" },
        ],
      },
      {
        id: 2,
        question: "What is your daily commute distance (one way)?",
        field: "commuteDistance",
        type: "single_choice",
        options: [
          { value: "less_than_5km", label: "Less than 5 km", icon: "📍" },
          { value: "five_to_15km", label: "5-15 km", icon: "📍" },
          { value: "fifteen_to_30km", label: "15-30 km", icon: "📍" },
          { value: "more_than_30km", label: "More than 30 km", icon: "📍" },
        ],
      },
      {
        id: 3,
        question: "What best describes your diet?",
        field: "dietType",
        type: "single_choice",
        options: [
          { value: "vegan", label: "Vegan (No animal products)", icon: "🌱" },
          { value: "vegetarian", label: "Vegetarian", icon: "🥬" },
          {
            value: "pescatarian",
            label: "Pescatarian (Fish only)",
            icon: "🐟",
          },
          {
            value: "occasional_meat",
            label: "Occasional Meat Eater",
            icon: "🍖",
          },
          { value: "regular_meat", label: "Regular Meat Eater", icon: "🥩" },
          { value: "heavy_meat", label: "Heavy Meat Consumer", icon: "🍗" },
        ],
      },
      {
        id: 4,
        question: "What is your home size?",
        field: "homeSize",
        type: "single_choice",
        options: [
          { value: "studio_1bhk", label: "Studio/1 BHK", icon: "🏠" },
          { value: "two_bhk", label: "2 BHK", icon: "🏡" },
          { value: "three_bhk", label: "3 BHK", icon: "🏘️" },
          { value: "four_plus_bhk", label: "4+ BHK", icon: "🏰" },
          {
            value: "independent_house",
            label: "Independent House",
            icon: "🏛️",
          },
        ],
      },
      {
        id: 5,
        question: "How many hours do you use AC daily?",
        field: "acUsage",
        type: "single_choice",
        options: [
          { value: "no_ac", label: "No AC", icon: "🌿" },
          { value: "less_than_2hrs", label: "Less than 2 hours", icon: "❄️" },
          { value: "two_to_4hrs", label: "2-4 hours", icon: "🧊" },
          { value: "four_to_6hrs", label: "4-6 hours", icon: "🌨️" },
          { value: "six_to_8hrs", label: "6-8 hours", icon: "🥶" },
          { value: "more_than_8hrs", label: "More than 8 hours", icon: "❄️💨" },
        ],
      },
      {
        id: 6,
        question: "How many hours do you spend on digital devices daily?",
        field: "digitalUsage",
        type: "single_choice",
        options: [
          { value: "less_than_2hrs", label: "Less than 2 hours", icon: "📱" },
          { value: "two_to_4hrs", label: "2-4 hours", icon: "💻" },
          { value: "four_to_6hrs", label: "4-6 hours", icon: "🖥️" },
          { value: "six_to_8hrs", label: "6-8 hours", icon: "⌨️" },
          { value: "eight_to_10hrs", label: "8-10 hours", icon: "📺" },
          { value: "more_than_10hrs", label: "More than 10 hours", icon: "🔌" },
        ],
      },
      {
        id: 7,
        question: "How would you describe your shopping habits?",
        field: "shoppingFrequency",
        type: "single_choice",
        options: [
          {
            value: "minimal_necessary",
            label: "Minimal - Only necessities",
            icon: "🛒",
          },
          {
            value: "monthly_planned",
            label: "Monthly planned shopping",
            icon: "📝",
          },
          {
            value: "weekly_regular",
            label: "Weekly regular shopping",
            icon: "🗓️",
          },
          {
            value: "frequent_impulse",
            label: "Frequent impulse buying",
            icon: "💳",
          },
          { value: "daily_shopping", label: "Daily shopping", icon: "🛍️" },
        ],
      },
      {
        id: 8,
        question: "How conscious are you about water usage?",
        field: "waterUsage",
        type: "single_choice",
        options: [
          {
            value: "very_conscious",
            label: "Very conscious - Quick showers, reuse water",
            icon: "💧",
          },
          {
            value: "moderately_conscious",
            label: "Moderately conscious",
            icon: "🚿",
          },
          { value: "average_usage", label: "Average usage", icon: "🏊" },
          { value: "above_average", label: "Above average usage", icon: "🛁" },
          {
            value: "high_usage",
            label: "High usage - Long showers, etc.",
            icon: "🌊",
          },
        ],
      },
      {
        id: 9,
        question: "How do you manage household waste?",
        field: "wasteManagement",
        type: "single_choice",
        options: [
          {
            value: "comprehensive_recycling",
            label: "Comprehensive recycling & composting",
            icon: "♻️",
          },
          {
            value: "basic_segregation",
            label: "Basic waste segregation",
            icon: "🗂️",
          },
          {
            value: "minimal_effort",
            label: "Minimal recycling effort",
            icon: "🗑️",
          },
          {
            value: "no_segregation",
            label: "No waste segregation",
            icon: "🚮",
          },
        ],
      },
      {
        id: 10,
        question: "How much food do you typically waste?",
        field: "foodWaste",
        type: "single_choice",
        options: [
          {
            value: "zero_waste",
            label: "Zero waste - Finish everything",
            icon: "✅",
          },
          { value: "minimal_waste", label: "Minimal waste", icon: "🥄" },
          {
            value: "occasional_waste",
            label: "Occasional food waste",
            icon: "🍽️",
          },
          { value: "regular_waste", label: "Regular food waste", icon: "🗑️" },
          {
            value: "significant_waste",
            label: "Significant food waste",
            icon: "❌",
          },
        ],
      },
      {
        id: 11,
        question: "How often do you travel by air?",
        field: "airTravel",
        type: "single_choice",
        options: [
          { value: "never", label: "Never/Rarely", icon: "🚫" },
          { value: "once_yearly", label: "Once a year", icon: "✈️" },
          { value: "twice_yearly", label: "Twice a year", icon: "🛫" },
          { value: "quarterly", label: "Every 3 months", icon: "🌍" },
          { value: "monthly", label: "Monthly", icon: "🛩️" },
          { value: "frequent_flyer", label: "Frequent flyer", icon: "🌎" },
        ],
      },
      {
        id: 12,
        question: "What type of energy does your home primarily use?",
        field: "energySource",
        type: "single_choice",
        options: [
          {
            value: "renewable_solar",
            label: "Renewable (Solar panels)",
            icon: "☀️",
          },
          {
            value: "mix_renewable",
            label: "Mix of renewable sources",
            icon: "🌱",
          },
          {
            value: "grid_efficient",
            label: "Efficient grid electricity",
            icon: "⚡",
          },
          {
            value: "standard_grid",
            label: "Standard grid electricity",
            icon: "🔌",
          },
          { value: "coal_heavy", label: "Coal-heavy electricity", icon: "🏭" },
        ],
      },
      {
        id: 13,
        question: "How often do you buy new clothes?",
        field: "clothingPurchases",
        type: "single_choice",
        options: [
          {
            value: "minimal_sustainable",
            label: "Minimal - Sustainable brands only",
            icon: "👕",
          },
          { value: "need_based", label: "Only when needed", icon: "🛒" },
          {
            value: "seasonal_shopping",
            label: "Seasonal shopping",
            icon: "🌸",
          },
          {
            value: "regular_fashion",
            label: "Regular fashion updates",
            icon: "👗",
          },
          {
            value: "frequent_fashion",
            label: "Frequent fast fashion",
            icon: "🛍️",
          },
        ],
      },
      {
        id: 14,
        question: "How do you typically exercise or stay fit?",
        field: "fitnessActivities",
        type: "single_choice",
        options: [
          {
            value: "outdoor_natural",
            label: "Outdoor activities (running, cycling)",
            icon: "🏃",
          },
          { value: "home_workouts", label: "Home workouts", icon: "🏠" },
          {
            value: "local_gym_walk",
            label: "Local gym (walking distance)",
            icon: "🏋️",
          },
          { value: "gym_commute", label: "Gym requiring commute", icon: "🚗" },
          {
            value: "fitness_travel",
            label: "Fitness activities requiring travel",
            icon: "🚙",
          },
        ],
      },
      {
        id: 15,
        question: "How would you rate your household appliance usage?",
        field: "applianceUsage",
        type: "single_choice",
        options: [
          {
            value: "energy_efficient_minimal",
            label: "Energy-efficient & minimal use",
            icon: "💡",
          },
          {
            value: "efficient_moderate",
            label: "Efficient appliances, moderate use",
            icon: "🔧",
          },
          {
            value: "standard_usage",
            label: "Standard appliances, normal use",
            icon: "🏠",
          },
          {
            value: "high_usage",
            label: "High usage of appliances",
            icon: "⚡",
          },
          {
            value: "excessive_usage",
            label: "Excessive appliance usage",
            icon: "🔌",
          },
        ],
      },
    ];

    return res.status(200).json({
      questions,
      totalQuestions: questions.length,
      message: "Onboarding questions retrieved successfully",
    });
  } catch (error) {
    console.error("getOnboardingQuestions error:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch onboarding questions." });
  }
};

// Validate onboarding responses
const validateOnboardingData = (onboardingData) => {
  const requiredFields = [
    "primaryTransport",
    "commuteDistance",
    "dietType",
    "homeSize",
    "acUsage",
    "digitalUsage",
    "shoppingFrequency",
    "waterUsage",
    "wasteManagement",
    "foodWaste",
    "airTravel",
    "energySource",
    "clothingPurchases",
    "fitnessActivities",
    "applianceUsage",
  ];

  const missingFields = requiredFields.filter(
    (field) => !onboardingData[field]
  );

  if (missingFields.length > 0) {
    return {
      isValid: false,
      missingFields,
      message: `Missing required fields: ${missingFields.join(", ")}`,
    };
  }

  return { isValid: true };
};

export const submitOnboarding = async (req, res) => {
  try {
    const uid = req.user.uid;
    const onboardingData = req.body;

    // Check that onboardingData is a plain object
    if (typeof onboardingData !== "object" || Array.isArray(onboardingData)) {
      return res.status(400).json({ error: "Invalid onboarding data format" });
    }

    // Validate onboarding data completeness
    const validation = validateOnboardingData(onboardingData);
    if (!validation.isValid) {
      return res.status(400).json({
        error: "Incomplete onboarding data",
        details: validation.message,
        missingFields: validation.missingFields,
      });
    }

    // Save onboarding profile
    const onboardingRef = admin
      .firestore()
      .doc(`users/${uid}/onboardingProfile/data`);
    await onboardingRef.set({
      ...onboardingData,
      completedAt: FieldValue.serverTimestamp(),
      version: "1.0", // Track onboarding version
      questionsCompleted: 15,
    });

    // Calculate baseline carbon footprint
    const carbonFootprint = calculateCarbonFootprint(onboardingData);
    const carbonData = {
      totalCarbonFootprint: carbonFootprint,
      calculatedAt: FieldValue.serverTimestamp(),
      unit: "kg CO2e per day",
      breakdown: generateCarbonBreakdown(onboardingData),
      category: getCarbonCategory(carbonFootprint),
    };

    // Save to main user document or carbonProfile
    const carbonRef = admin
      .firestore()
      .doc(`users/${uid}/carbonProfile/baseline`);
    await carbonRef.set(carbonData);

    // Initialize gamification data if first time
    const gamificationRef = admin
      .firestore()
      .doc(`users/${uid}/gamification/data`);

    const gamificationDoc = await gamificationRef.get();
    if (!gamificationDoc.exists) {
      await gamificationRef.set({
        ecoPoints: 50, // Bonus points for completing onboarding
        level: 1,
        totalChallengesCompleted: 0,
        streakDays: 0,
        createdAt: FieldValue.serverTimestamp(),
        lastUpdated: FieldValue.serverTimestamp(),
      });
    }

    return res.status(200).json({
      message: "Onboarding completed successfully!",
      carbonData,
      gamificationBonus: 50,
      recommendations: generateRecommendations(onboardingData, carbonFootprint),
    });
  } catch (error) {
    console.error("submitOnboarding error:", error);
    return res.status(500).json({ error: "Failed to save onboarding data." });
  }
};

// Helper function to generate carbon breakdown
const generateCarbonBreakdown = (onboardingData) => {
  const breakdown = {};
  const carbonEmissionMapping = {
    primaryTransport: {
      car_daily: 8.5,
      public_transport: 2.3,
      bike_scooter: 1.2,
      walking: 0.0,
      electric_vehicle: 3.1,
      work_from_home: 0.0,
    },
    commuteDistance: {
      less_than_5km: 1.0,
      five_to_15km: 2.5,
      fifteen_to_30km: 4.2,
      more_than_30km: 6.8,
    },
    dietType: {
      vegan: 1.5,
      vegetarian: 2.3,
      pescatarian: 3.2,
      occasional_meat: 4.1,
      regular_meat: 5.8,
      heavy_meat: 7.2,
    },
    homeSize: {
      studio_1bhk: 0.8,
      two_bhk: 1.5,
      three_bhk: 2.2,
      four_plus_bhk: 3.1,
      independent_house: 4.0,
    },
    acUsage: {
      no_ac: 0.0,
      less_than_2hrs: 1.2,
      two_to_4hrs: 2.8,
      four_to_6hrs: 4.2,
      six_to_8hrs: 5.6,
      more_than_8hrs: 7.3,
    },
  };

  for (const [key, value] of Object.entries(onboardingData)) {
    if (carbonEmissionMapping[key] && carbonEmissionMapping[key][value]) {
      breakdown[key] = {
        value,
        emission: carbonEmissionMapping[key][value],
        percentage: 0, // Will be calculated after total
      };
    }
  }

  // Calculate percentages
  const total = Object.values(breakdown).reduce(
    (sum, item) => sum + item.emission,
    0
  );
  Object.keys(breakdown).forEach((key) => {
    breakdown[key].percentage = (
      (breakdown[key].emission / total) *
      100
    ).toFixed(1);
  });

  return breakdown;
};

// Helper function to categorize carbon footprint
const getCarbonCategory = (carbonFootprint) => {
  if (carbonFootprint < 10) return "Low Impact";
  if (carbonFootprint < 20) return "Moderate Impact";
  if (carbonFootprint < 30) return "High Impact";
  return "Very High Impact";
};

// Helper function to generate personalized recommendations
const generateRecommendations = (onboardingData, carbonFootprint) => {
  const recommendations = [];

  if (onboardingData.primaryTransport === "car_daily") {
    recommendations.push({
      category: "Transportation",
      suggestion:
        "Consider using public transport or carpooling 2-3 days per week",
      potentialSaving: "3-5 kg CO2e per day",
    });
  }

  if (
    onboardingData.dietType === "heavy_meat" ||
    onboardingData.dietType === "regular_meat"
  ) {
    recommendations.push({
      category: "Diet",
      suggestion:
        "Try 'Meat-free Monday' or reduce meat consumption by 1-2 meals per week",
      potentialSaving: "1-3 kg CO2e per day",
    });
  }

  if (
    onboardingData.acUsage === "more_than_8hrs" ||
    onboardingData.acUsage === "six_to_8hrs"
  ) {
    recommendations.push({
      category: "Energy",
      suggestion:
        "Set AC temperature to 24°C and use fans to supplement cooling",
      potentialSaving: "1-2 kg CO2e per day",
    });
  }

  if (onboardingData.wasteManagement === "no_segregation") {
    recommendations.push({
      category: "Waste",
      suggestion:
        "Start with basic waste segregation - separate dry and wet waste",
      potentialSaving: "0.5-1 kg CO2e per day",
    });
  }

  return recommendations.slice(0, 3); // Return top 3 recommendations
};

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
        totalQuestions: 15,
        completedQuestions: 0,
        nextQuestion: 1,
      });
    }

    const onboardingData = onboardingDoc.data();
    const requiredFields = [
      "primaryTransport",
      "commuteDistance",
      "dietType",
      "homeSize",
      "acUsage",
      "digitalUsage",
      "shoppingFrequency",
      "waterUsage",
      "wasteManagement",
      "foodWaste",
      "airTravel",
      "energySource",
      "clothingPurchases",
      "fitnessActivities",
      "applianceUsage",
    ];

    const completedFields = requiredFields.filter(
      (field) => onboardingData[field]
    );
    const completedQuestions = completedFields.length;
    const totalQuestions = requiredFields.length;
    const progress = Math.round((completedQuestions / totalQuestions) * 100);
    const isCompleted = completedQuestions === totalQuestions;

    return res.status(200).json({
      isCompleted,
      progress,
      totalQuestions,
      completedQuestions,
      nextQuestion: isCompleted ? null : completedQuestions + 1,
      completedFields,
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

    const dashboardData = {
      name: userDoc.exists ? userDoc.data().name : null,
      profilePictureUrl: userDoc.exists
        ? userDoc.data().profilePictureUrl
        : null,
      ecoPoints: gamificationDoc.exists ? gamificationDoc.data().ecoPoints : 0,
      level: gamificationDoc.exists ? gamificationDoc.data().level : 1,
      baselineCarbonFootprint: carbonDoc.exists ? carbonDoc.data() : null,
    };

    return res.status(200).json({ dashboardData });
  } catch (error) {
    console.error("getDashboardData error:", error);
    return res.status(500).json({ error: "Failed to fetch dashboard data." });
  }
};
