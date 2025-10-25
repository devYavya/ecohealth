// Backup the existing updateChallengeProgress function and create a new simplified one
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();

export const updateChallengeProgressFixed = async (uid, dailyLogData) => {
  try {
    console.log("\n🎯 CHALLENGE PROGRESS UPDATE START");
    console.log("User ID:", uid);
    console.log("Daily Log Date:", dailyLogData.date);
    console.log(
      "Daily Log Answers:",
      JSON.stringify(dailyLogData.dailyLogAnswers, null, 2)
    );

    // Get all active challenges for the user
    const challengesSnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("challenges")
      .where("isCompleted", "==", false)
      .get();

    if (challengesSnapshot.empty) {
      console.log("⚠️ No active challenges found for user");
      return { success: true, updatesCount: 0 };
    }

    for (const challengeDoc of challengesSnapshot.docs) {
      const challengeData = challengeDoc.data();
      const {
        criteria,
        challengeId,
        pointsAwarded,
        badgeAwarded,
        type,
        challengeType,
      } = challengeData;

      // Use challengeType as fallback if type is undefined
      const actualType = type || challengeType || "lifestyle";

      console.log(`\n🏆 Processing Challenge: ${challengeId} (${actualType})`);
      console.log(`📋 Criteria:`, criteria);
      console.log(`📦 Full Challenge Data:`, challengeData);

      let criteriaMetToday = false;

      // LIFESTYLE CHALLENGES - Simplified Logic
      if (
        actualType === "lifestyle" ||
        challengeId.includes("waste") ||
        challengeId.includes("carbon_negative") ||
        challengeId.includes("influence")
      ) {
        console.log("🌍 Processing LIFESTYLE challenge...");

        // For Daily Logging challenges
        if (criteria.dailyLogging && dailyLogData.date) {
          console.log("✅ DAILY LOGGING CRITERIA MET");
          criteriaMetToday = true;
        }

        // Fallback: Any daily log submission for lifestyle counts
        if (!criteriaMetToday && dailyLogData.date) {
          console.log("✅ FALLBACK: Daily log exists for lifestyle challenge");
          criteriaMetToday = true;
        }
      }

      // DIET CHALLENGES
      else if (
        actualType === "diet" ||
        challengeId.includes("meat") ||
        challengeId.includes("plant")
      ) {
        console.log("🍽️ Processing DIET challenge...");

        const dietAnswers = dailyLogData.dailyLogAnswers?.diet;
        if (dietAnswers) {
          const { mealsWithMeat, totalMealsToday } = dietAnswers;

          // For vegan challenges
          if (criteria.dietInput === "vegan" && mealsWithMeat === 0) {
            console.log("✅ VEGAN CRITERIA MET: No meat meals");
            criteriaMetToday = true;
          }

          // For meat reduction challenges
          if (criteria.meatPercentage && totalMealsToday > 0) {
            const actualMeatPercentage =
              (mealsWithMeat / totalMealsToday) * 100;
            const targetMeatPercentage =
              parseInt(criteria.meatPercentage.replace(/\D/g, "")) || 50;

            if (actualMeatPercentage <= targetMeatPercentage) {
              console.log(
                `✅ MEAT REDUCTION MET: ${actualMeatPercentage}% <= ${targetMeatPercentage}%`
              );
              criteriaMetToday = true;
            }
          }
        }
      }

      // TRANSPORT CHALLENGES
      else if (
        actualType === "transport" ||
        challengeId.includes("transport") ||
        challengeId.includes("car") ||
        challengeId.includes("public")
      ) {
        console.log("🚗 Processing TRANSPORT challenge...");

        const transportAnswers = dailyLogData.dailyLogAnswers?.transport;
        if (transportAnswers) {
          const { primaryTransportMode } = transportAnswers;

          if (
            criteria.transportInput === "public" &&
            ["metro", "bus", "walking", "bike"].includes(primaryTransportMode)
          ) {
            console.log("✅ PUBLIC TRANSPORT CRITERIA MET");
            criteriaMetToday = true;
          }

          if (
            criteria.transportInput === "cycling" &&
            ["bike", "walking"].includes(primaryTransportMode)
          ) {
            console.log("✅ CYCLING CRITERIA MET");
            criteriaMetToday = true;
          }
        }
      }

      // ELECTRICITY CHALLENGES
      else if (
        actualType === "electricity" ||
        challengeId.includes("energy") ||
        challengeId.includes("ac")
      ) {
        console.log("⚡ Processing ELECTRICITY challenge...");

        const electricityAnswers = dailyLogData.dailyLogAnswers?.electricity;
        if (electricityAnswers) {
          const { acUsageHours, highPowerAppliances } = electricityAnswers;

          // AC usage check
          if (criteria.airConditionerUsage) {
            const acHourMapping = {
              0: 0,
              less_than_2: 1.5,
              "2_to_4": 3,
              "4_plus": 6,
            };
            const actualHours = acHourMapping[acUsageHours] || 0;

            if (actualHours <= criteria.airConditionerUsage) {
              console.log("✅ AC USAGE CRITERIA MET");
              criteriaMetToday = true;
            }
          }

          // Unplugged appliances check
          if (criteria.unpluggedAppliances) {
            const appliances = Array.isArray(highPowerAppliances)
              ? highPowerAppliances
              : [];
            const unpluggedCount = Math.max(0, 5 - appliances.length); // Assume 5 total appliances

            if (unpluggedCount >= criteria.unpluggedAppliances) {
              console.log("✅ UNPLUGGED APPLIANCES CRITERIA MET");
              criteriaMetToday = true;
            }
          }
        }
      }

      // Update progress if criteria met
      if (criteriaMetToday) {
        const currentProgress = challengeData.progress || 0;
        const newProgress = currentProgress + 1;

        // Get target progress - fetch duration from main challenge if not in user's data
        let targetProgress = challengeData.duration;

        if (!targetProgress) {
          console.log(
            "⚠️ Duration not found in user challenge data, fetching from main challenge..."
          );
          try {
            const mainChallengeDoc = await db
              .collection("challenges")
              .doc(challengeId)
              .get();
            if (mainChallengeDoc.exists) {
              const mainChallengeData = mainChallengeDoc.data();
              targetProgress = mainChallengeData.duration;
              console.log(
                `✅ Found duration in main challenge: ${targetProgress}`
              );
            }
          } catch (error) {
            console.log(
              "❌ Error fetching main challenge data:",
              error.message
            );
          }
        }

        // Fallback to default durations if still not found
        if (!targetProgress) {
          const defaultDurations = {
            energy_efficient_week: 7,
            zero_waste_lifestyle: 7,
            public_transport_week: 7,
            reduce_ac_usage: 5,
            meat_free_week: 7,
            plant_based_week: 7,
            advanced_sustainability: 14,
          };
          targetProgress =
            defaultDurations[challengeId] ||
            (actualType === "lifestyle" ? 7 : 1);
          console.log(`⚠️ Using fallback duration: ${targetProgress}`);
        }

        const isCompleted = newProgress >= targetProgress;

        console.log(
          `📊 Progress Info: Current=${currentProgress}, New=${newProgress}, Target=${targetProgress}, Duration=${
            challengeData.duration || "fetched from main challenge"
          }`
        );

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
          console.log("🎉 CHALLENGE COMPLETED!");
        } else {
          console.log(
            `🔄 Challenge in progress: ${newProgress}/${targetProgress} days`
          );
        }

        await db
          .collection("users")
          .doc(uid)
          .collection("challenges")
          .doc(challengeId)
          .update(updateData);

        console.log(`📈 PROGRESS UPDATED: ${newProgress}/${targetProgress}`);

        // Update gamification if completed
        if (isCompleted) {
          const gamificationRef = db
            .collection("users")
            .doc(uid)
            .collection("gamification")
            .doc("data");
          const gamificationDoc = await gamificationRef.get();

          if (gamificationDoc.exists) {
            const data = gamificationDoc.data();
            await gamificationRef.update({
              ecoPoints: (data.ecoPoints || 0) + pointsAwarded,
              level:
                Math.floor(((data.ecoPoints || 0) + pointsAwarded) / 100) + 1,
              totalChallengesCompleted:
                (data.totalChallengesCompleted || 0) + 1,
              badges:
                badgeAwarded && !data.badges?.includes(badgeAwarded)
                  ? [...(data.badges || []), badgeAwarded]
                  : data.badges || [],
              updatedAt: new Date(),
            });
          } else {
            await gamificationRef.set({
              ecoPoints: pointsAwarded,
              level: 1,
              badges: badgeAwarded ? [badgeAwarded] : [],
              totalChallengesCompleted: 1,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
          console.log("🎮 Gamification updated");
        }
      } else {
        console.log("❌ CRITERIA NOT MET");
      }
    }

    console.log("✅ CHALLENGE PROGRESS UPDATE COMPLETE");
    return { success: true };
  } catch (err) {
    console.error("❌ Error updating challenge progress:", err);
    return { success: false, error: err.message };
  }
};
