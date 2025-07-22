import { admin } from "../config/firebase.js";
import { calculateCarbonFootprint } from "../utils/carbonLogic.js";

const FieldValue = admin.firestore.FieldValue;

// Sample onboarding profiles for testing
const sampleOnboardingProfiles = [
  {
    uid: "sample_user_1_eco_conscious",
    profile: {
      primaryTransport: "bike_scooter",
      commuteDistance: "less_than_5km",
      dietType: "vegetarian",
      homeSize: "two_bhk",
      acUsage: "less_than_2hrs",
      digitalUsage: "four_to_6hrs",
      shoppingFrequency: "minimal_necessary",
      waterUsage: "very_conscious",
      wasteManagement: "comprehensive_recycling",
      foodWaste: "minimal_waste",
      airTravel: "never",
      energySource: "mix_renewable",
      clothingPurchases: "need_based",
      fitnessActivities: "outdoor_natural",
      applianceUsage: "energy_efficient_minimal",
    },
  },
  {
    uid: "sample_user_2_moderate",
    profile: {
      primaryTransport: "public_transport",
      commuteDistance: "five_to_15km",
      dietType: "occasional_meat",
      homeSize: "three_bhk",
      acUsage: "four_to_6hrs",
      digitalUsage: "six_to_8hrs",
      shoppingFrequency: "monthly_planned",
      waterUsage: "moderately_conscious",
      wasteManagement: "basic_segregation",
      foodWaste: "occasional_waste",
      airTravel: "once_yearly",
      energySource: "standard_grid",
      clothingPurchases: "seasonal_shopping",
      fitnessActivities: "local_gym_walk",
      applianceUsage: "efficient_moderate",
    },
  },
  {
    uid: "sample_user_3_high_impact",
    profile: {
      primaryTransport: "car_daily",
      commuteDistance: "more_than_30km",
      dietType: "heavy_meat",
      homeSize: "independent_house",
      acUsage: "more_than_8hrs",
      digitalUsage: "more_than_10hrs",
      shoppingFrequency: "frequent_impulse",
      waterUsage: "high_usage",
      wasteManagement: "no_segregation",
      foodWaste: "significant_waste",
      airTravel: "monthly",
      energySource: "coal_heavy",
      clothingPurchases: "frequent_fashion",
      fitnessActivities: "fitness_travel",
      applianceUsage: "excessive_usage",
    },
  },
];

export const seedOnboardingData = async () => {
  try {
    console.log("🌱 Starting onboarding data seeding...");

    for (const userProfile of sampleOnboardingProfiles) {
      const { uid, profile } = userProfile;

      // Create user document if it doesn't exist
      const userRef = admin.firestore().doc(`users/${uid}`);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        await userRef.set({
          name: `Sample User ${uid.split("_")[2]}`,
          email: `${uid}@example.com`,
          createdAt: FieldValue.serverTimestamp(),
          isTestUser: true,
        });
      }

      // Save onboarding profile
      const onboardingRef = admin
        .firestore()
        .doc(`users/${uid}/onboardingProfile/data`);

      await onboardingRef.set({
        ...profile,
        completedAt: FieldValue.serverTimestamp(),
        version: "1.0",
        questionsCompleted: 15,
        isSeeded: true,
      });

      // Calculate and save carbon footprint
      const carbonFootprint = calculateCarbonFootprint(profile);
      const carbonData = {
        totalCarbonFootprint: carbonFootprint,
        calculatedAt: FieldValue.serverTimestamp(),
        unit: "kg CO2e per day",
        category: getCarbonCategory(carbonFootprint),
        isSeeded: true,
      };

      const carbonRef = admin
        .firestore()
        .doc(`users/${uid}/carbonProfile/baseline`);
      await carbonRef.set(carbonData);

      // Initialize gamification data
      const gamificationRef = admin
        .firestore()
        .doc(`users/${uid}/gamification/data`);

      await gamificationRef.set({
        ecoPoints: 50,
        level: 1,
        totalChallengesCompleted: 0,
        streakDays: 0,
        createdAt: FieldValue.serverTimestamp(),
        lastUpdated: FieldValue.serverTimestamp(),
        isSeeded: true,
      });

      console.log(
        `✅ Seeded onboarding data for ${uid} - Carbon footprint: ${carbonFootprint} kg CO2e/day`
      );
    }

    console.log("🎉 Onboarding data seeding completed successfully!");

    // Log summary
    console.log("\n📊 Summary:");
    console.log(`Total profiles seeded: ${sampleOnboardingProfiles.length}`);
    for (const userProfile of sampleOnboardingProfiles) {
      const carbonFootprint = calculateCarbonFootprint(userProfile.profile);
      console.log(
        `${
          userProfile.uid
        }: ${carbonFootprint} kg CO2e/day (${getCarbonCategory(
          carbonFootprint
        )})`
      );
    }
  } catch (error) {
    console.error("❌ Error seeding onboarding data:", error);
    throw error;
  }
};

// Helper function to categorize carbon footprint
const getCarbonCategory = (carbonFootprint) => {
  if (carbonFootprint < 10) return "Low Impact";
  if (carbonFootprint < 20) return "Moderate Impact";
  if (carbonFootprint < 30) return "High Impact";
  return "Very High Impact";
};

// Run seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedOnboardingData()
    .then(() => {
      console.log("✨ Seeding script completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seeding script failed:", error);
      process.exit(1);
    });
}
