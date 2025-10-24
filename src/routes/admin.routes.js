import express from "express";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { verifyAdmin } from "../middlewares/admin.middleware.js";
import {
  getAllUsers,
  getUserStats,
  deleteUser,
  updateUserRole,
  getAdminLogs,
  getSchedulerStatus,
  triggerDailyTipsGeneration,
  getAutomationHealth,
} from "../controllers/admin.controller.js";

const router = express.Router();

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "user123"
 *         email:
 *           type: string
 *           example: "user@example.com"
 *         name:
 *           type: string
 *           example: "John Doe"
 *         role:
 *           type: string
 *           enum: [user, admin]
 *           example: "user"
 *         age:
 *           type: number
 *           example: 25
 *         gender:
 *           type: string
 *           example: "male"

 *         createdAt:
 *           type: string
 *           format: date-time
 *         profileComplete:
 *           type: boolean
 *           example: true
 */

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of users per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or email
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, user]
 *         description: Filter by user role
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                   example: "Users retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/User'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalUsers:
 *                           type: integer
 *                         usersPerPage:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get("/users", verifyToken, verifyAdmin, getAllUsers);

/**
 * @swagger
 * /api/admin/users/stats:
 *   get:
 *     summary: Get user statistics (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                       example: 150
 *                     usersByRole:
 *                       type: object
 *                       properties:
 *                         admin:
 *                           type: integer
 *                           example: 3
 *                         user:
 *                           type: integer
 *                           example: 147
 *                     growth:
 *                       type: object
 *                       properties:
 *                         newUsersThisMonth:
 *                           type: integer
 *                           example: 25
 *                         newUsersLast30Days:
 *                           type: integer
 *                           example: 32
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get("/users/stats", verifyToken, verifyAdmin, getUserStats);

/**
 * @swagger
 * /api/admin/users/{userId}:
 *   delete:
 *     summary: Delete a user (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to delete
 *     responses:
 *       200:
 *         description: User deleted successfully
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
 *                   example: "User deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedUserId:
 *                       type: string
 *                     deletedUserEmail:
 *                       type: string
 *       400:
 *         description: Bad request (e.g., trying to delete own account)
 *       403:
 *         description: Forbidden - Cannot delete admin users
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.delete("/users/:userId", verifyToken, verifyAdmin, deleteUser);

/**
 * @swagger
 * /api/admin/users/{userId}/role:
 *   put:
 *     summary: Update user role (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, user]
 *                 example: "admin"
 *     responses:
 *       200:
 *         description: User role updated successfully
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
 *                   example: "User role updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     userEmail:
 *                       type: string
 *                     oldRole:
 *                       type: string
 *                     newRole:
 *                       type: string
 *       400:
 *         description: Bad request (invalid role or trying to change own role)
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.put("/users/:userId/role", verifyToken, verifyAdmin, updateUserRole);

/**
 * @swagger
 * /api/admin/logs:
 *   get:
 *     summary: Get admin activity logs (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of logs per page
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [DELETE_USER, UPDATE_USER_ROLE]
 *         description: Filter by action type
 *     responses:
 *       200:
 *         description: Admin logs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     logs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           action:
 *                             type: string
 *                           adminUid:
 *                             type: string
 *                           adminEmail:
 *                             type: string
 *                           targetUserId:
 *                             type: string
 *                           targetUserEmail:
 *                             type: string
 *                           timestamp:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin access required
 *       500:
 *         description: Server error
 */
router.get("/logs", verifyToken, verifyAdmin, getAdminLogs);

/**
 * @swagger
 * /api/admin/scheduler/status:
 *   get:
 *     summary: Get scheduler status (Admin only)
 *     tags: [Admin - Automation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Scheduler status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "running"
 *                     jobs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           schedule:
 *                             type: string
 *                           running:
 *                             type: boolean
 *                           scheduled:
 *                             type: boolean
 *                     nextRuns:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                           nextRun:
 *                             type: string
 */
router.get("/scheduler/status", verifyToken, verifyAdmin, getSchedulerStatus);

/**
 * @swagger
 * /api/admin/tips/generate-now:
 *   post:
 *     summary: Manually trigger daily tips generation (Admin only)
 *     tags: [Admin - Automation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daily tips generation triggered successfully
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
 *                   example: "Daily tips generation triggered successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     triggeredBy:
 *                       type: string
 *                     triggeredAt:
 *                       type: string
 *                       format: date-time
 */
router.post(
  "/tips/generate-now",
  verifyToken,
  verifyAdmin,
  triggerDailyTipsGeneration
);

/**
 * @swagger
 * /api/admin/automation/health:
 *   get:
 *     summary: Get automation health status (Admin only)
 *     tags: [Admin - Automation]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Automation health status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     overall:
 *                       type: string
 *                       enum: [healthy, warning, error]
 *                       example: "healthy"
 *                     issues:
 *                       type: array
 *                       items:
 *                         type: string
 *                     scheduler:
 *                       type: object
 *                       properties:
 *                         running:
 *                           type: boolean
 *                         jobs:
 *                           type: array
 *                     dailyTips:
 *                       type: object
 *                       properties:
 *                         available:
 *                           type: boolean
 *                         count:
 *                           type: integer
 *                         date:
 *                           type: string
 *                     userTips:
 *                       type: object
 *                       properties:
 *                         hasRecentAssignments:
 *                           type: boolean
 *                         recentCount:
 *                           type: integer
 */
router.get("/automation/health", verifyToken, verifyAdmin, getAutomationHealth);

export default router;
