import { admin } from "../config/firebase.js";
import { calculateCarbonFootprint } from "../utils/carbonLogic.js";

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
            { value: "not_sure", label: "Not Sure", icon: "❓" },
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
            { value: "not_sure", label: "Not sure", icon: "❓" },
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
          question: "How many people usually travel with you?",
          field: "passengers",
          type: "single_choice",
          options: [
            { value: "alone", label: "I travel alone", icon: "👤" },
            { value: "one_passenger", label: "One passenger", icon: "👥" },
            {
              value: "two_plus_passengers",
              label: "Two or more passengers",
              icon: "👨‍👩‍👧‍👦",
            },
            {
              value: "shared_public",
              label: "It's shared/public transport",
              icon: "🚌",
            },
          ],
        },
        {
          id: "transport_6",
          question: "Approximately how many flights do you take per year?",
          field: "flightsPerYear",
          type: "single_choice",
          options: [
            { value: "0", label: "0", icon: "🚫" },
            { value: "1_2", label: "1–2", icon: "✈️" },
            { value: "3_5", label: "3–5", icon: "🛫" },
            { value: "6plus", label: "6+", icon: "🌍" },
          ],
        },
        {
          id: "transport_7",
          question: "What is your vehicle's approximate mileage (if known)?",
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
            { value: "not_sure", label: "Not sure", icon: "❓" },
          ],
        },
      ],
      diet: [
        {
          id: "diet_1",
          question: "On average, how many meals do you eat per day?",
          field: "mealsPerDay",
          type: "single_choice",
          options: [
            { value: 1, label: "1", icon: "🍽️" },
            { value: 2, label: "2", icon: "🍽️🍽️" },
            { value: 3, label: "3", icon: "🍽️🍽️🍽️" },
            { value: 4, label: "4+", icon: "🍽️+" },
          ],
        },
        {
          id: "diet_2a",
          question:
            "What percentage of your meals consist of meat-based meals?",
          field: "meatPercentage",
          type: "slider",
          min: 0,
          max: 100,
          step: 5,
          unit: "%",
          description: "Beef, chicken, mutton, fish",
        },
        {
          id: "diet_2b",
          question:
            "What percentage of your meals consist of dairy & egg-based meals?",
          field: "dairyPercentage",
          type: "slider",
          min: 0,
          max: 100,
          step: 5,
          unit: "%",
          description: "Milk, paneer, cheese, yogurt, eggs",
        },
        {
          id: "diet_2c",
          question:
            "What percentage of your meals consist of plant-based meals?",
          field: "plantPercentage",
          type: "slider",
          min: 0,
          max: 100,
          step: 5,
          unit: "%",
          description: "Grains, pulses, vegetables, fruits, nuts",
        },
        {
          id: "diet_3",
          question: "How often do you eat outside or order food online?",
          field: "orderedMealsFreq",
          type: "single_choice",
          options: [
            { value: "never", label: "Never", icon: "🚫" },
            { value: "1_2_week", label: "1–2 meals per week", icon: "🍕" },
            { value: "3_5_week", label: "3–5 meals per week", icon: "🍔" },
            { value: "6_9_week", label: "6–9 meals per week", icon: "🛍️" },
            { value: "10_15_week", label: "10–15 meals per week", icon: "📦" },
            { value: "16_20_week", label: "16–20 meals per week", icon: "🚚" },
            {
              value: "20plus_week",
              label: "More than 20 meals per week",
              icon: "🔥",
            },
          ],
        },
        {
          id: "diet_4",
          question: "How often do you eat processed, packaged, or junk food?",
          field: "junkFoodFreq",
          type: "single_choice",
          options: [
            { value: "daily", label: "Daily", icon: "🍟" },
            { value: "few_times_week", label: "Few times a week", icon: "🥤" },
            { value: "occasionally", label: "Occasionally", icon: "🍿" },
            { value: "rarely_never", label: "Rarely/Never", icon: "🥗" },
          ],
        },
        {
          id: "diet_5",
          question: "How often do you waste food at home?",
          field: "foodWaste",
          type: "single_choice",
          options: [
            { value: "never", label: "Never", icon: "✅" },
            { value: "rarely", label: "Rarely", icon: "🟢" },
            { value: "sometimes", label: "Sometimes", icon: "🟡" },
            { value: "often", label: "Often", icon: "🔴" },
          ],
        },
      ],
      electricity: [
        {
          id: "electricity_1a",
          question:
            "What is your average monthly electricity usage in kilowatt-hours (kWh)?",
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
          type: "single_choice",
          options: [
            { value: 1, label: "1", icon: "👤" },
            { value: 2, label: "2", icon: "👥" },
            { value: 3, label: "3", icon: "👨‍👩‍👧" },
            { value: 4, label: "4+", icon: "👨‍👩‍👧‍👦" },
          ],
        },
        {
          id: "electricity_3",
          question:
            "How many hours per day do you typically spend at home (awake)?",
          field: "timeAtHome",
          type: "single_choice",
          options: [
            { value: "4_hours_less", label: "4 hours or less", icon: "⏰" },
            { value: "5_8_hours", label: "5–8 hours", icon: "🕐" },
            { value: "9_12_hours", label: "9–12 hours", icon: "🕒" },
            { value: "12plus_hours", label: "More than 12 hours", icon: "🕕" },
          ],
        },
        {
          id: "electricity_4",
          question: "Which appliances do you regularly use at home?",
          field: "appliances",
          type: "multi_select",
          options: [
            { value: "air_conditioner", label: "Air Conditioner", icon: "❄️" },
            { value: "geyser", label: "Geyser/Water Heater", icon: "🚿" },
            { value: "refrigerator", label: "Refrigerator", icon: "🧊" },
            { value: "washing_machine", label: "Washing Machine", icon: "👕" },
            { value: "microwave", label: "Microwave", icon: "📡" },
            {
              value: "laptop_desktop",
              label: "Laptop/Desktop (4+ hrs/day)",
              icon: "💻",
            },
            { value: "tv_console", label: "TV or Game Console", icon: "📺" },
          ],
        },
        {
          id: "electricity_5",
          question:
            "Do you use renewable energy (solar/green electricity) at home?",
          field: "renewableEnergy",
          type: "single_choice",
          options: [
            {
              value: "mostly_renewable",
              label: "Yes, mostly renewable",
              icon: "☀️",
            },
            {
              value: "partially_renewable",
              label: "Partially renewable",
              icon: "🌱",
            },
            { value: "no_renewable", label: "No", icon: "🔌" },
            { value: "not_sure", label: "Not sure", icon: "❓" },
          ],
        },
      ],
      lifestyle: [
        {
          id: "lifestyle_1",
          question:
            "How much time do you spend on screens per day (phone, laptop, TV, etc.)?",
          field: "screenTime",
          type: "single_choice",
          options: [
            { value: "less_2hrs", label: "Less than 2 hours", icon: "📱" },
            { value: "2_4hrs", label: "2–4 hours", icon: "💻" },
            { value: "4_6hrs", label: "4–6 hours", icon: "🖥️" },
            { value: "6plus_hrs", label: "More than 6 hours", icon: "📺" },
          ],
        },
        {
          id: "lifestyle_2",
          question:
            "How often do you shop for non-essential items (gadgets, fashion, gifts)?",
          field: "nonEssentialShopping",
          type: "single_choice",
          options: [
            { value: "weekly", label: "Weekly", icon: "🛍️" },
            {
              value: "few_times_month",
              label: "Few times a month",
              icon: "🛒",
            },
            { value: "monthly", label: "Once a month", icon: "📅" },
            { value: "rarely_never", label: "Rarely/Never", icon: "🚫" },
          ],
        },
        {
          id: "lifestyle_3",
          question:
            "How often do you buy clothes, shoes, or fashion accessories?",
          field: "fashionShopping",
          type: "single_choice",
          options: [
            {
              value: "more_once_month",
              label: "More than once a month",
              icon: "👗",
            },
            {
              value: "every_1_2_months",
              label: "Once every 1–2 months",
              icon: "👕",
            },
            {
              value: "every_3plus_months",
              label: "Once every 3+ months",
              icon: "👖",
            },
            { value: "rarely_never", label: "Rarely/Never", icon: "🚫" },
          ],
        },
        {
          id: "lifestyle_4",
          question: "How many online orders do you receive per month?",
          field: "onlineOrders",
          type: "single_choice",
          options: [
            { value: "0", label: "0", icon: "🚫" },
            { value: "1_5", label: "1–5", icon: "📦" },
            { value: "6_10", label: "6–10", icon: "📦📦" },
            { value: "11_15", label: "11–15", icon: "📦📦📦" },
            { value: "15plus", label: "15+", icon: "🚚" },
          ],
        },
        {
          id: "lifestyle_5",
          question: "How do you manage household waste?",
          field: "wasteManagement",
          type: "single_choice",
          options: [
            {
              value: "recycle_compost",
              label: "Mostly recycle and compost",
              icon: "♻️",
            },
            {
              value: "recycle_some",
              label: "Recycle some, throw some",
              icon: "🗂️",
            },
            {
              value: "throw_everything",
              label: "Throw everything together",
              icon: "🗑️",
            },
            { value: "not_sure", label: "Not sure", icon: "❓" },
          ],
        },
      ],
    };

    return res.status(200).json({
      questions,
      totalQuestions: Object.values(questions).flat().length,
      message: "Comprehensive onboarding questions retrieved successfully",
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

    // Structure data for new carbon logic
    const profileData = {
      transport: {
        primaryMode: onboardingData.primaryMode,
        fuelType: onboardingData.fuelType,
        evChargingSource: onboardingData.evChargingSource,
        dailyDistance: onboardingData.dailyDistance,
        passengers: onboardingData.passengers,
        flightsPerYear: onboardingData.flightsPerYear,
        mileage: onboardingData.mileage,
      },
      diet: {
        mealsPerDay: onboardingData.mealsPerDay,
        meatPercentage: onboardingData.meatPercentage || 0,
        dairyPercentage: onboardingData.dairyPercentage || 0,
        plantPercentage: onboardingData.plantPercentage || 0,
        orderedMealsFreq: onboardingData.orderedMealsFreq,
        junkFoodFreq: onboardingData.junkFoodFreq,
        foodWaste: onboardingData.foodWaste,
      },
      electricity: {
        monthlyKwh: onboardingData.monthlyKwh,
        monthlyKwhEstimate: onboardingData.monthlyKwhEstimate,
        householdSize: onboardingData.householdSize,
        timeAtHome: onboardingData.timeAtHome,
        appliances: onboardingData.appliances || [],
        renewableEnergy: onboardingData.renewableEnergy,
      },
      lifestyle: {
        screenTime: onboardingData.screenTime,
        nonEssentialShopping: onboardingData.nonEssentialShopping,
        fashionShopping: onboardingData.fashionShopping,
        onlineOrders: onboardingData.onlineOrders,
        wasteManagement: onboardingData.wasteManagement,
      },
    };

    // Sanitize data - remove undefined values that Firestore can't handle
    const sanitizeForFirestore = (obj) => {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value !== undefined && value !== null) {
          if (typeof value === "object" && !Array.isArray(value)) {
            const sanitizedNested = sanitizeForFirestore(value);
            if (Object.keys(sanitizedNested).length > 0) {
              sanitized[key] = sanitizedNested;
            }
          } else {
            sanitized[key] = value;
          }
        }
      }
      return sanitized;
    };

    const sanitizedProfileData = sanitizeForFirestore(profileData);

    // Save onboarding profile
    const onboardingRef = admin
      .firestore()
      .doc(`users/${uid}/onboardingProfile/data`);
    await onboardingRef.set({
      ...sanitizedProfileData,
      completedAt: FieldValue.serverTimestamp(),
      version: "2.0", // Updated version for new structure
      questionsCompleted: Object.values(sanitizedProfileData).flat().length,
    });

    // Calculate baseline carbon footprint using new logic
    const carbonFootprint = calculateCarbonFootprint(profileData);
    const carbonData = {
      totalCarbonFootprint: carbonFootprint.total,
      breakdown: carbonFootprint.breakdown,
      calculatedAt: FieldValue.serverTimestamp(),
      unit: "kg CO2e per day",
      category: getCarbonCategory(carbonFootprint.total),
    };

    // Save to main user document or carbonProfile
    const carbonRef = admin
      .firestore()
      .doc(`users/${uid}/carbonProfile/baseline`);
    await carbonRef.set(carbonData);

    // Initialize or update gamification data with onboarding bonus
    const gamificationRef = admin
      .firestore()
      .doc(`users/${uid}/gamification/data`);

    const gamificationDoc = await gamificationRef.get();
    if (!gamificationDoc.exists) {
      // First time user - create new gamification data
      await gamificationRef.set({
        ecoPoints: 50, // Bonus points for completing onboarding
        onboardingBonus: 50,
        level: 1,
        totalChallengesCompleted: 0,
        createdAt: FieldValue.serverTimestamp(),
        lastUpdated: FieldValue.serverTimestamp(),
      });
    } else {
      // Existing user - add onboarding bonus to existing points
      const existingData = gamificationDoc.data();

      // Check if onboarding bonus was already given
      if (!existingData.onboardingBonus) {
        await gamificationRef.update({
          ecoPoints: FieldValue.increment(50),
          onboardingBonus: 50,
          lastUpdated: FieldValue.serverTimestamp(),
        });
        console.log(
          `🎉 Added 50 onboarding bonus points to user ${uid}. Total points: ${
            (existingData.ecoPoints || 0) + 50
          }`
        );
      } else {
        console.log(`ℹ️ User ${uid} already received onboarding bonus`);
      }
    }

    return res.status(200).json({
      message: "Onboarding completed successfully!",
      carbonData,
      gamificationBonus: 50,
      recommendations: generateRecommendations(
        profileData,
        carbonFootprint.total
      ),
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
const generateRecommendations = (profileData, carbonFootprint) => {
  const recommendations = [];

  // Transport recommendations
  if (profileData.transport.primaryMode === "personal_car") {
    recommendations.push({
      category: "Transportation",
      suggestion:
        "Consider using public transport or carpooling 2-3 days per week",
      potentialSaving: "3-5 kg CO2e per day",
    });
  }

  // Diet recommendations
  if ((profileData.diet.meatPercentage || 0) > 50) {
    recommendations.push({
      category: "Diet",
      suggestion:
        "Try reducing meat consumption by 20-30% and increase plant-based meals",
      potentialSaving: "1-3 kg CO2e per day",
    });
  }

  // Electricity recommendations
  if (profileData.electricity.appliances?.includes("air_conditioner")) {
    recommendations.push({
      category: "Energy",
      suggestion:
        "Set AC temperature to 24°C and use fans to supplement cooling",
      potentialSaving: "1-2 kg CO2e per day",
    });
  }

  // Lifestyle recommendations
  if (profileData.lifestyle.wasteManagement === "throw_everything") {
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
