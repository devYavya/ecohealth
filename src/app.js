import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { setupSwaggerDocs } from "./config/swagger.js";
import morgan from "morgan";
import {admin} from "./config/firebase.js";
admin;

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
// import onboardingRoutes from "./routes/onboarding.routes.js";
// import carbonRoutes from "./routes/carbon.routes.js";
// import tipsRoutes from "./routes/tips.routes.js";
// import challengeRoutes from "./routes/challenge.routes.js";
// import feedRoutes from "./routes/feed.routes.js";

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
// app.use("/api/onboarding", onboardingRoutes);
// app.use("/api/carbon", carbonRoutes);
// app.use("/api/tips", tipsRoutes);
// app.use("/api/challenges", challengeRoutes);
// app.use("/api/feed", feedRoutes);

// Error handler
app.use(errorHandler);

export default app;
