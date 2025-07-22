// scripts/seedChallenges.js

import { getFirestore } from "firebase-admin/firestore";
import { admin } from "../src/config/firebase.js";

const db = getFirestore();

const sampleChallenges = [
  {
    challengeId: "meat_free_monday",
    name: "Meat-Free Monday",
    description: "Go vegetarian or vegan for a day!",
    startDate: new Date("2025-01-01"),
    endDate: new Date("2025-12-31"),
    pointsAwarded: 20,
    badgeAwarded: "Meat-Free Master",
    type: "diet",
    criteria: {
      dietInput: "vegetarian",
    },
  },
  {
    challengeId: "ac_free_day",
    name: "AC-Free Day",
    description: "Keep your air conditioning off for a full day",
    startDate: new Date("2025-01-01"),
    endDate: new Date("2025-12-31"),
    pointsAwarded: 15,
    badgeAwarded: "Energy Saver",
    type: "electricity",
    criteria: {
      electricityUsage: 2,
    },
  },
  {
    challengeId: "green_commute",
    name: "Green Commute Challenge",
    description: "Use eco-friendly transportation for your daily commute",
    startDate: new Date("2025-01-01"),
    endDate: new Date("2025-12-31"),
    pointsAwarded: 25,
    badgeAwarded: "Green Commuter",
    type: "transport",
    criteria: {
      transportInput: "cycling",
    },
  },
  {
    challengeId: "water_warrior",
    name: "Water Warrior",
    description: "Reduce water usage by taking shorter showers",
    startDate: new Date("2025-01-01"),
    endDate: new Date("2025-12-31"),
    pointsAwarded: 10,
    badgeAwarded: "Water Warrior",
    type: "water",
    criteria: {
      waterUsage: 50,
    },
  },
  {
    challengeId: "digital_detox",
    name: "Digital Detox Day",
    description: "Limit your screen time to reduce digital carbon footprint",
    startDate: new Date("2025-01-01"),
    endDate: new Date("2025-12-31"),
    pointsAwarded: 15,
    badgeAwarded: "Digital Minimalist",
    type: "digital",
    criteria: {
      digitalUsage: 3,
    },
  },
];

async function seedChallenges() {
  try {
    console.log("Starting to seed challenges...");

    const batch = db.batch();

    for (const challenge of sampleChallenges) {
      const challengeRef = db
        .collection("challenges")
        .doc(challenge.challengeId);
      batch.set(challengeRef, {
        ...challenge,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await batch.commit();
    console.log(`Successfully seeded ${sampleChallenges.length} challenges`);

    // Verify the challenges were created
    const challengesSnapshot = await db.collection("challenges").get();
    console.log(`Total challenges in database: ${challengesSnapshot.size}`);

    process.exit(0);
  } catch (error) {
    console.error("Error seeding challenges:", error);
    process.exit(1);
  }
}

seedChallenges();
