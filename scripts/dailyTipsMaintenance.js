import dotenv from "dotenv";
import AITipsService from "../src/services/aiTips.service.js";

// Load environment variables
dotenv.config();

/**
 * Daily maintenance script for AI Tips
 * Should be run once per day (preferably early morning)
 *
 * This script:
 * 1. Generates new 25 tips using Gemini AI
 * 2. Deletes old tips from previous days
 * 3. Cleans up old user tips
 * 4. Logs the results for monitoring
 */
async function dailyTipsMaintenance() {
  const startTime = new Date();
  console.log(
    `🌅 Starting daily tips maintenance at ${startTime.toISOString()}`
  );
  console.log("=".repeat(60));

  const results = {
    tipGeneration: null,
    userTipsCleanup: null,
    errors: [],
    executionTime: 0,
  };

  try {
    // Step 1: Generate new daily tips with Gemini
    console.log("1️⃣ Generating new daily tips with Gemini AI...");
    try {
      results.tipGeneration = await AITipsService.generateAndStoreDailyTips();
      console.log("✅ Tips generation:", results.tipGeneration.message);
      if (results.tipGeneration.tipsCount) {
        console.log(
          `   Generated ${results.tipGeneration.tipsCount} tips for today`
        );
      }
    } catch (error) {
      console.error("❌ Failed to generate daily tips:", error.message);
      results.errors.push({ step: "tipGeneration", error: error.message });
    }

    console.log("");

    // Step 2: Clean up old user tips
    console.log("2️⃣ Cleaning up old user tips...");
    try {
      results.userTipsCleanup = await AITipsService.cleanupOldUserTips();
      console.log("✅ User tips cleanup:", results.userTipsCleanup.message);
      if (results.userTipsCleanup.deletedCount > 0) {
        console.log(
          `   Deleted ${results.userTipsCleanup.deletedCount} old user tips`
        );
      }
    } catch (error) {
      console.error("❌ Failed to cleanup user tips:", error.message);
      results.errors.push({ step: "userTipsCleanup", error: error.message });
    }

    console.log("");

    // Step 3: Generate summary report
    const endTime = new Date();
    results.executionTime = Math.round((endTime - startTime) / 1000);

    console.log("📊 MAINTENANCE SUMMARY");
    console.log("-".repeat(40));
    console.log(`⏱️  Execution time: ${results.executionTime} seconds`);
    console.log(
      `🔥 Tips generated: ${results.tipGeneration?.tipsCount || "Failed"}`
    );
    console.log(
      `🧹 Old tips cleaned: ${
        results.userTipsCleanup?.deletedCount || "Failed"
      }`
    );
    console.log(`❌ Errors: ${results.errors.length}`);

    if (results.errors.length > 0) {
      console.log("\n🔴 ERROR DETAILS:");
      results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.step}: ${error.error}`);
      });
    }

    console.log("");
    console.log(
      results.errors.length === 0
        ? "✅ Daily maintenance completed successfully!"
        : "⚠️  Daily maintenance completed with errors!"
    );

    // Return results for monitoring/logging systems
    return {
      success: results.errors.length === 0,
      timestamp: endTime.toISOString(),
      results,
      summary: {
        executionTimeSeconds: results.executionTime,
        tipsGenerated: results.tipGeneration?.tipsCount || 0,
        oldTipsDeleted: results.userTipsCleanup?.deletedCount || 0,
        errorsCount: results.errors.length,
      },
    };
  } catch (error) {
    console.error("💥 Critical error during maintenance:", error);
    return {
      success: false,
      timestamp: new Date().toISOString(),
      criticalError: error.message,
      results,
    };
  }
}

/**
 * Health check for the tips system
 */
async function healthCheck() {
  console.log("🏥 Running tips system health check...");

  try {
    // Check if we can get today's tips
    const todaysTips = await AITipsService.getTodaysTipsFromDB();
    const hasValidTips = Array.isArray(todaysTips) && todaysTips.length >= 20;

    console.log(`📊 Today's tips count: ${todaysTips.length}`);
    console.log(`✅ Valid tips pool: ${hasValidTips ? "Yes" : "No"}`);

    if (!hasValidTips) {
      console.log(
        "⚠️  Warning: Tips pool is insufficient, generating new tips..."
      );
      await AITipsService.generateAndStoreDailyTips();
    }

    return { healthy: true, tipsCount: todaysTips.length };
  } catch (error) {
    console.error("❌ Health check failed:", error.message);
    return { healthy: false, error: error.message };
  }
}

// Main execution
async function main() {
  const command = process.argv[2] || "maintenance";

  switch (command) {
    case "maintenance":
      await dailyTipsMaintenance();
      break;
    case "health":
      await healthCheck();
      break;
    case "generate":
      console.log("🔄 Force generating new tips...");
      const result = await AITipsService.generateAndStoreDailyTips();
      console.log("✅ Result:", result);
      break;
    case "cleanup":
      console.log("🧹 Force cleaning up old tips...");
      const cleanupResult = await AITipsService.cleanupOldUserTips();
      console.log("✅ Cleanup result:", cleanupResult);
      break;
    default:
      console.log(
        "Usage: node dailyTipsMaintenance.js [maintenance|health|generate|cleanup]"
      );
      console.log("  maintenance - Run full daily maintenance (default)");
      console.log("  health      - Check system health");
      console.log("  generate    - Force generate new tips");
      console.log("  cleanup     - Force cleanup old tips");
      process.exit(1);
  }

  process.exit(0);
}

// Handle errors
process.on("unhandledRejection", (error) => {
  console.error("❌ Unhandled promise rejection:", error);
  process.exit(1);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught exception:", error);
  process.exit(1);
});

// Run the maintenance
main();
