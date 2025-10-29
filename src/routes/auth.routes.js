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
  resendVerificationEmail,
  verifyEmailComplete,
} from "../controllers/auth.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import {
  validateRequest,
  signupSchema,
  loginSchema,
  socialLoginSchema,
  passwordResetSchema,
} from "../middlewares/validation.middleware.js";
import { passwordResetLimiter } from "../middlewares/rateLimiter.middleware.js";

// Routes with validation and rate limiting
router.post("/signup", validateRequest(signupSchema), signup);
router.post("/login", validateRequest(loginSchema), login);
router.post("/social-login", validateRequest(socialLoginSchema), socialLogin);
router.post(
  "/reset-password",
  passwordResetLimiter,
  validateRequest(passwordResetSchema),
  sendPasswordResetEmail
);
router.post("/refresh-token", refreshToken);
router.post("/logout", logout);
router.post("/resend-verification-email", resendVerificationEmail);
router.post("/verify-email-complete", verifyToken, verifyEmailComplete);

export default router;
/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication & User Login APIs
 */

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
 *             required: [email, password, name, age, gender]
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
 *               country:
 *                 type: string
 *                 default: India
 *                 example: India
 *                 description: User's country (determines timezone automatically)
 *               referredBy:
 *                 type: string
 *                 example: JOHUSE6633
 *                 description: Referral code of the person who referred this user (optional)
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
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Account created successfully! Please complete your profile."
 *                 data:
 *                   type: object
 *                   properties:
 *                     uid:
 *                       type: string
 *                       example: abcd1234uid
 *                     email:
 *                       type: string
 *                       example: user@example.com
 *                     name:
 *                       type: string
 *                       example: John Doe
 *                     age:
 *                       type: integer
 *                       example: 30
 *                     gender:
 *                       type: string
 *                       example: Male
 *                     role:
 *                       type: string
 *                       example: user
 *                     country:
 *                       type: string
 *                       example: India
 *                     timezone:
 *                       type: string
 *                       example: Asia/Kolkata
 *                     referralCode:
 *                       type: string
 *                       example: JOHUSE6633
 *                     referredBy:
 *                       type: string
 *                       example: JOHUSE6633
 *                       description: Only included if referral code was provided
 *                     profileComplete:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Invalid input, invalid referral code
 *       409:
 *         description: Email already exists
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
 *     summary: Login or register using Google or Apple
 *     description: |
 *       Accepts an ID token from Google or Apple to authenticate the user.
 *       If the user doesn't exist, a new account will be created automatically.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: ID token obtained from the provider's SDK
 *                 example: eyJhbGciOiJSUzI1NiIsInR...
 *     responses:
 *       200:
 *         description: Social login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR...
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: 64f1b9a0e4a12c4567a89b12
 *                     name:
 *                       type: string
 *                       example: John Doe
 *                     email:
 *                       type: string
 *                       example: johndoe@example.com
 *       400:
 *         description: Invalid social login token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid token
 *       401:
 *         description: Unauthorized - Token verification failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Token verification failed
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Something went wrong
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

/**
 * @swagger
 * /api/auth/resend-verification-email:
 *   post:
 *     summary: Resend verification email to user
 *     description: Sends a new verification email with a fresh verification link. Use this when user hasn't received the initial verification email or the link has expired.
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
 *                 format: email
 *                 example: user@example.com
 *                 description: User's email address registered with the system
 *     responses:
 *       200:
 *         description: Verification email resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Verification email resent successfully! Please check your inbox."
 *       400:
 *         description: Bad request - Email is required or already verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Email is already verified."
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "User not found."
 *       500:
 *         description: Server error - Failed to resend verification email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to resend verification email."
 */

/**
 * @swagger
 * /api/auth/verify-email-complete:
 *   post:
 *     summary: Complete email verification
 *     description: Called after user clicks the verification link in their email. This endpoint confirms the email verification in Firebase and Firestore, then sends a welcome email.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Email verified successfully! 🎉"
 *                 data:
 *                   type: object
 *                   properties:
 *                     emailVerified:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: "Your account is now fully activated."
 *       400:
 *         description: Email not yet verified in Firebase Auth
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Email is not verified yet. Please click the verification link in your email."
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Authorization header is required."
 *       500:
 *         description: Server error - Failed to complete email verification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Failed to complete email verification."
 */
