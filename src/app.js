import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { setupSwaggerDocs } from "./config/swagger.js";
import morgan from "morgan";
import { admin } from "./config/firebase.js";
admin;

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import onboardingRoutes from "./routes/onboarding.routes.js";
import socialFeedRoutes from "./routes/socialFeed.routes.js";


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
app.use("/api/feed", socialFeedRoutes);


// Error handler
app.use(errorHandler);

export default app;
