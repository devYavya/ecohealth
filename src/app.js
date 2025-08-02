import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { setupSwaggerDocs } from "./config/swagger.js";
import morgan from "morgan";
import { admin } from "./config/firebase.js";
import schedulerService from "./services/scheduler.service.js";
admin;

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import onboardingRoutes from "./routes/onboarding.routes.js";
import dailyLogsRoutes from "./routes/dailyLogs.routes.js";
// import carbonRoutes from "./routes/carbon.routes.js";
// import tipsRoutes from "./routes/tips.routes.js";
import aiTipsRoutes from "./routes/aiTips.routes.js";
// import gamificationRoutes from "./routes/gamification.routes.js";
import socialFeedRoutes from "./routes/socialFeed.routes.js";
import challengesRoutes from "./routes/challenges.routes.js";
import adminRoutes from "./routes/admin.routes.js";

import { errorHandler } from "./middlewares/error.middleware.js";

dotenv.config();

const app = express();
setupSwaggerDocs(app);
//  Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/daily-logs", dailyLogsRoutes);
// app.use("/api/carbon", carbonRoutes);
// app.use("/api/tips", tipsRoutes);
app.use("/api/ai-tips", aiTipsRoutes);
// app.use("/api/gamification", gamificationRoutes);
app.use("/api/feed", socialFeedRoutes);
app.use("/api/challenges", challengesRoutes);
app.use("/api/admin", adminRoutes);

// Error handler
app.use(errorHandler);

// Start automated scheduled jobs
console.log("🤖 Initializing AI Tips Automation...");
schedulerService.startScheduledJobs();

// Graceful shutdown handler
process.on("SIGTERM", () => {
  console.log("SIGTERM received, stopping scheduled jobs...");
  schedulerService.stopAllJobs();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, stopping scheduled jobs...");
  schedulerService.stopAllJobs();
  process.exit(0);
});

export default app;
