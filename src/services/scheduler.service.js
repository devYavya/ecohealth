import cron from "node-cron";
import AITipsService from "./aiTips.service.js";

/**
 * Scheduler Service for Automated AI Tips Generation
 * Automatically generates 25 new tips daily at 12:00 AM
 */
class SchedulerService {
  constructor() {
    this.jobs = [];
    this.isInitialized = false;
  }

  /**
   * Start all scheduled jobs
   */
  startScheduledJobs() {
    if (this.isInitialized) {
      console.log("⚠️  Scheduler already initialized, skipping...");
      return;
    }

    console.log("🕐 Starting scheduled jobs...");

    // Daily tips generation at 12:00 AM (midnight)
    const dailyTipsJob = cron.schedule(
      "0 0 * * *",
      async () => {
        await this.runDailyTipsGeneration();
      },
      {
        scheduled: true,
        timezone: "Asia/Kolkata", // Set your timezone
      }
    );

    // Weekly cleanup job (runs every Sunday at 2:00 AM)
    const weeklyCleanupJob = cron.schedule(
      "0 2 * * 0",
      async () => {
        await this.runWeeklyCleanup();
      },
      {
        scheduled: true,
        timezone: "Asia/Kolkata",
      }
    );

    // Health check job (runs every 6 hours)
    const healthCheckJob = cron.schedule(
      "0 */6 * * *",
      async () => {
        await this.runHealthCheck();
      },
      {
        scheduled: true,
        timezone: "Asia/Kolkata",
      }
    );

    this.jobs.push(
      {
        name: "Daily Tips Generation",
        job: dailyTipsJob,
        schedule: "12:00 AM daily",
        isActive: true,
      },
      {
        name: "Weekly Cleanup",
        job: weeklyCleanupJob,
        schedule: "2:00 AM every Sunday",
        isActive: true,
      },
      {
        name: "Health Check",
        job: healthCheckJob,
        schedule: "Every 6 hours",
        isActive: true,
      }
    );

    this.isInitialized = true;

    console.log("✅ Scheduled jobs started:");
    this.jobs.forEach(({ name, schedule }) => {
      console.log(`   📅 ${name}: ${schedule}`);
    });

    // Run initial tip generation if no tips exist for today
    this.runInitialSetup();
  }

  /**
   * Daily tips generation job
   */
  async runDailyTipsGeneration() {
    const startTime = new Date();
    console.log(
      `🌙 [${startTime.toISOString()}] Running automatic daily tips generation...`
    );

    try {
      const result = await AITipsService.generateAndStoreDailyTips();

      if (result.success) {
        console.log(`✅ Daily tips generated successfully: ${result.message}`);
        if (result.tipsCount) {
          console.log(
            `   📊 Generated ${result.tipsCount} tips for ${
              new Date().toISOString().split("T")[0]
            }`
          );
        }
      } else {
        console.error(`❌ Daily tips generation failed: ${result.message}`);
      }

      // Also run cleanup of old user tips
      try {
        const cleanupResult = await AITipsService.cleanupOldUserTips();
        if (cleanupResult.success && cleanupResult.deletedCount > 0) {
          console.log(
            `🧹 Cleaned up ${cleanupResult.deletedCount} old user tips`
          );
        }
      } catch (cleanupError) {
        console.error(
          "⚠️  Cleanup failed during daily generation:",
          cleanupError.message
        );
      }

      const duration = Math.round((new Date() - startTime) / 1000);
      console.log(`⏱️  Daily generation completed in ${duration} seconds\n`);
    } catch (error) {
      console.error("💥 Critical error in daily tips generation:", error);

      // Could add notification/alerting here for production
      // await this.sendAlert('Daily Tips Generation Failed', error.message);
    }
  }

  /**
   * Weekly cleanup job
   */
  async runWeeklyCleanup() {
    console.log(`🧹 [${new Date().toISOString()}] Running weekly cleanup...`);

    try {
      const cleanupResult = await AITipsService.cleanupOldUserTips();

      if (cleanupResult.success) {
        console.log(`✅ Weekly cleanup completed: ${cleanupResult.message}`);
        if (cleanupResult.deletedCount > 0) {
          console.log(
            `   🗑️  Deleted ${cleanupResult.deletedCount} old records`
          );
        }
      } else {
        console.error(`❌ Weekly cleanup failed: ${cleanupResult.message}`);
      }
    } catch (error) {
      console.error("💥 Weekly cleanup error:", error);
    }
  }

  /**
   * Health check job
   */
  async runHealthCheck() {
    try {
      const todaysTips = await AITipsService.getTodaysTipsFromDB();
      const hasValidTips = Array.isArray(todaysTips) && todaysTips.length >= 20;

      if (!hasValidTips) {
        console.log(
          `⚠️  [${new Date().toISOString()}] Health check warning: Insufficient tips (${
            todaysTips.length
          })`
        );

        // Auto-generate tips if none exist
        console.log("🔄 Auto-generating missing tips...");
        await AITipsService.generateAndStoreDailyTips();
        console.log("✅ Missing tips generated automatically");
      } else {
        console.log(
          `💚 [${new Date().toISOString()}] Health check passed: ${
            todaysTips.length
          } tips available`
        );
      }
    } catch (error) {
      console.error(
        `💔 [${new Date().toISOString()}] Health check failed:`,
        error.message
      );
    }
  }

  /**
   * Run initial setup when server starts
   */
  async runInitialSetup() {
    console.log("🚀 Running initial tips setup...");

    try {
      // Check if we have tips for today
      const todaysTips = await AITipsService.getTodaysTipsFromDB();

      if (!todaysTips || todaysTips.length < 20) {
        console.log(
          "📝 No sufficient tips found for today, generating initial set..."
        );
        const result = await AITipsService.generateAndStoreDailyTips();

        if (result.success) {
          console.log(`✅ Initial tips generated: ${result.tipsCount} tips`);
        } else {
          console.log(`⚠️  Initial generation message: ${result.message}`);
        }
      } else {
        console.log(
          `✅ Tips already available for today: ${todaysTips.length} tips`
        );
      }
    } catch (error) {
      console.error("❌ Initial setup failed:", error.message);
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stopAllJobs() {
    console.log("🛑 Stopping all scheduled jobs...");

    this.jobs.forEach(({ name, job }) => {
      job.destroy();
      console.log(`   ❌ Stopped: ${name}`);
    });

    this.jobs = [];
    this.isInitialized = false;
    console.log("✅ All scheduled jobs stopped");
  }

  /**
   * Get status of all jobs
   */
  getJobsStatus() {
    return this.jobs.map(({ name, schedule, isActive }) => ({
      name,
      schedule,
      running: isActive,
      scheduled: isActive,
    }));
  }

  /**
   * Manually trigger daily tips generation (for testing)
   */
  async triggerDailyGeneration() {
    console.log("🔄 Manually triggering daily tips generation...");
    await this.runDailyTipsGeneration();
  }

  /**
   * Get next scheduled run times
   */
  getNextRunTimes() {
    return this.jobs.map(({ name, job }) => ({
      name,
      nextRun: job.nextDate ? job.nextDate().format() : "Not scheduled",
      status: job.running ? "Running" : job.scheduled ? "Scheduled" : "Stopped",
    }));
  }
}

// Create singleton instance
const schedulerService = new SchedulerService();

export default schedulerService;
