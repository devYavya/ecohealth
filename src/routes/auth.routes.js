// src/routes/auth.routes.js
import express from "express";
const router = express.Router();
import {
  login,
  signup,
  socialLogin,
  sendPasswordResetEmail,
  refreshToken,
  logout,
} from "../controllers/auth.controller.js";
import {
  validateRequest,
  signupSchema,
  loginSchema,
  socialLoginSchema,
  passwordResetSchema,
} from "../middlewares/validation.middleware.js";
import {
  authLimiter,
  passwordResetLimiter,
} from "../middlewares/rateLimiter.middleware.js";

// Routes with validation and rate limiting
router.post("/signup", authLimiter, validateRequest(signupSchema), signup);
router.post("/login", authLimiter, validateRequest(loginSchema), login);
router.post(
  "/social-login",
  authLimiter,
  validateRequest(socialLoginSchema),
  socialLogin
);
router.post(
  "/reset-password",
  passwordResetLimiter,
  validateRequest(passwordResetSchema),
  sendPasswordResetEmail
);
router.post("/refresh-token", authLimiter, refreshToken);
router.post("/logout", logout);

export default router;
/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication & User Login APIs
 */

/**
/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: User sign up with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, name, age, gender, bloodGroup]
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: P@ssw0rd123
 *               name:
 *                 type: string
 *                 example: John Doe
 *               age:
 *                 type: integer
 *                 example: 30
 *               gender:
 *                 type: string
 *                 enum: [Male, Female, Other]
 *                 example: Male
 *               bloodGroup:
 *                 type: string
 *                 example: B+
 *               role:
 *                 type: string
 *                 enum: [user, admin]
 *                 default: user
 *                 description: User role (defaults to 'user', 'admin' only allowed for specific emails)
 *                 example: user
 *     responses:
 *       201:
 *         description: Signup successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Signup successful
 *                 uid:
 *                   type: string
 *                   example: abcd1234uid
 *       400:
 *         description: Invalid input or email already exists
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: P@ssw0rd123
 *     responses:
 *       200:
 *         description: Login successful, returns token
 *       401:
 *         description: Invalid credentials
 */

/**
 * @swagger
 * /api/auth/social-login:
 *   post:
 *     summary: Login using Google or Apple
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [provider, idToken]
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [google, apple]
 *                 example: google
 *               idToken:
 *                 type: string
 *                 example: eyJhbGciOiJSUzI1NiIsInR...
 *     responses:
 *       200:
 *         description: Social login successful
 *       400:
 *         description: Invalid social login token or provider
 */

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Send password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       400:
 *         description: Email not found
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout the user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
