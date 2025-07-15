// src/routes/auth.routes.js
import express from "express";
const router = express.Router();
import {
  login,
  signup,
  socialLogin,
  sendPasswordResetEmail,
  logout,
} from "../controllers/auth.controller.js";
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
 *             required: [email, password, displayName]
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: P@ssw0rd123
 *               displayName:
 *                 type: string
 *                 example: JohnDoe
 *     responses:
 *       201:
 *         description: User created successfully
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


router.post("/signup", signup);
router.post("/login", login);
router.post("/social-login", socialLogin);
router.post("/reset-password", sendPasswordResetEmail);
router.post("/logout", logout);

export default router;
