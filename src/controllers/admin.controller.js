import { admin } from "../config/firebase.js";
import { sendSuccessResponse, sendErrorResponse } from "../utils/response.js";
import schedulerService from "../services/scheduler.service.js";

const FieldValue = admin.firestore.FieldValue;

// Get all users (Admin only)
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "", role = "" } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let query = admin.firestore().collection("users");

    // Filter by role if specified
    if (role && (role === "admin" || role === "user")) {
      query = query.where("role", "==", role);
    }

    // Get total count for pagination
    const totalSnapshot = await query.get();
    const totalUsers = totalSnapshot.size;

    // Apply pagination
    query = query.offset(offset).limit(limitNum);

    // Order by creation date (newest first)
    query = query.orderBy("createdAt", "desc");

    const snapshot = await query.get();
    const users = [];

    snapshot.forEach((doc) => {
      const userData = doc.data();
      // Remove sensitive information
      const { password, ...safeUserData } = userData;
      users.push({
        id: doc.id,
        ...safeUserData,
        createdAt: userData.createdAt?.toDate?.() || userData.createdAt,
        lastUpdatedAt:
          userData.lastUpdatedAt?.toDate?.() || userData.lastUpdatedAt,
      });
    });

    // Apply search filter (client-side for simplicity)
    let filteredUsers = users;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = users.filter(
        (user) =>
          user.name?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower)
      );
    }

    return sendSuccessResponse(res, 200, "Users retrieved successfully", {
      users: filteredUsers,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalUsers / limitNum),
        totalUsers,
        usersPerPage: limitNum,
        hasNextPage: pageNum * limitNum < totalUsers,
        hasPrevPage: pageNum > 1,
      },
      filters: {
        search,
        role: role || "all",
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);
    return sendErrorResponse(res, 500, "Failed to retrieve users");
  }
};

// Get user statistics (Admin only)
export const getUserStats = async (req, res) => {
  try {
    const usersCollection = admin.firestore().collection("users");

    // Get total users
    const totalUsersSnapshot = await usersCollection.get();
    const totalUsers = totalUsersSnapshot.size;

    // Get users by role
    const adminUsersSnapshot = await usersCollection
      .where("role", "==", "admin")
      .get();
    const regularUsersSnapshot = await usersCollection
      .where("role", "==", "user")
      .get();

    const adminCount = adminUsersSnapshot.size;
    const userCount = regularUsersSnapshot.size;

    // Get users created in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentUsersSnapshot = await usersCollection
      .where("createdAt", ">=", FieldValue.serverTimestamp())
      .get();

    // Calculate monthly growth (simplified)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);

    const monthlyUsersSnapshot = await usersCollection
      .where("createdAt", ">=", firstDayOfMonth)
      .get();

    return sendSuccessResponse(
      res,
      200,
      "User statistics retrieved successfully",
      {
        totalUsers,
        usersByRole: {
          admin: adminCount,
          user: userCount,
        },
        growth: {
          newUsersThisMonth: monthlyUsersSnapshot.size,
          newUsersLast30Days: recentUsersSnapshot.size,
        },
        lastUpdated: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error("Get user stats error:", error);
    return sendErrorResponse(res, 500, "Failed to retrieve user statistics");
  }
};

// Delete user (Admin only)
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const adminUid = req.admin.uid;

    // Prevent admin from deleting themselves
    if (userId === adminUid) {
      return sendErrorResponse(res, 400, "You cannot delete your own account");
    }

    // Check if user exists
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(userId)
      .get();
    if (!userDoc.exists) {
      return sendErrorResponse(res, 404, "User not found");
    }

    const userData = userDoc.data();

    // Prevent deletion of other admins (optional security measure)
    if (userData.role === "admin") {
      return sendErrorResponse(res, 403, "Cannot delete admin users");
    }

    // Delete from Firebase Auth
    await admin.auth().deleteUser(userId);

    // Delete from Firestore (user document and subcollections)
    const batch = admin.firestore().batch();

    // Delete main user document
    batch.delete(admin.firestore().collection("users").doc(userId));

    // Delete user subcollections (onboarding, carbon profile, gamification, etc.)
    const subcollections = [
      "onboardingProfile",
      "carbonProfile",
      "gamification",
      "dailyLogs",
      "challengeProgress",
    ];

    for (const subcollection of subcollections) {
      const subcollectionRef = admin
        .firestore()
        .collection("users")
        .doc(userId)
        .collection(subcollection);
      const subcollectionSnapshot = await subcollectionRef.get();

      subcollectionSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
    }

    // Execute batch delete
    await batch.commit();

    // Log the deletion for audit purposes
    await admin.firestore().collection("admin_logs").add({
      action: "DELETE_USER",
      adminUid,
      adminEmail: req.admin.email,
      targetUserId: userId,
      targetUserEmail: userData.email,
      targetUserName: userData.name,
      timestamp: FieldValue.serverTimestamp(),
      details: "User account and all associated data deleted",
    });

    return sendSuccessResponse(res, 200, "User deleted successfully", {
      deletedUserId: userId,
      deletedUserEmail: userData.email,
    });
  } catch (error) {
    console.error("Delete user error:", error);

    if (error.code === "auth/user-not-found") {
      return sendErrorResponse(
        res,
        404,
        "User not found in authentication system"
      );
    }

    return sendErrorResponse(res, 500, "Failed to delete user");
  }
};

// Update user role (Admin only)
export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const adminUid = req.admin.uid;

    // Validate role
    if (!role || !["admin", "user"].includes(role)) {
      return sendErrorResponse(
        res,
        400,
        "Invalid role. Must be 'admin' or 'user'"
      );
    }

    // Prevent admin from changing their own role
    if (userId === adminUid) {
      return sendErrorResponse(res, 400, "You cannot change your own role");
    }

    // Check if user exists
    const userDoc = await admin
      .firestore()
      .collection("users")
      .doc(userId)
      .get();
    if (!userDoc.exists) {
      return sendErrorResponse(res, 404, "User not found");
    }

    const userData = userDoc.data();

    // Update user role
    await admin.firestore().collection("users").doc(userId).update({
      role,
      lastUpdatedAt: FieldValue.serverTimestamp(),
      roleUpdatedBy: adminUid,
      roleUpdatedAt: FieldValue.serverTimestamp(),
    });

    // Log the role change for audit purposes
    await admin.firestore().collection("admin_logs").add({
      action: "UPDATE_USER_ROLE",
      adminUid,
      adminEmail: req.admin.email,
      targetUserId: userId,
      targetUserEmail: userData.email,
      targetUserName: userData.name,
      oldRole: userData.role,
      newRole: role,
      timestamp: FieldValue.serverTimestamp(),
    });

    return sendSuccessResponse(res, 200, "User role updated successfully", {
      userId,
      userEmail: userData.email,
      oldRole: userData.role,
      newRole: role,
    });
  } catch (error) {
    console.error("Update user role error:", error);
    return sendErrorResponse(res, 500, "Failed to update user role");
  }
};

// Get admin activity logs (Admin only)
export const getAdminLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action = "" } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    let query = admin.firestore().collection("admin_logs");

    // Filter by action if specified
    if (action) {
      query = query.where("action", "==", action);
    }

    // Order by timestamp (newest first)
    query = query.orderBy("timestamp", "desc");

    // Apply pagination
    query = query.offset(offset).limit(limitNum);

    const snapshot = await query.get();
    const logs = [];

    snapshot.forEach((doc) => {
      const logData = doc.data();
      logs.push({
        id: doc.id,
        ...logData,
        timestamp: logData.timestamp?.toDate?.() || logData.timestamp,
      });
    });

    return sendSuccessResponse(res, 200, "Admin logs retrieved successfully", {
      logs,
      pagination: {
        currentPage: pageNum,
        logsPerPage: limitNum,
      },
    });
  } catch (error) {
    console.error("Get admin logs error:", error);
    return sendErrorResponse(res, 500, "Failed to retrieve admin logs");
  }
};

// Get scheduler status (Admin only)
export const getSchedulerStatus = async (req, res) => {
  try {
    const jobsStatus = schedulerService.getJobsStatus();
    const nextRunTimes = schedulerService.getNextRunTimes();

    return sendSuccessResponse(
      res,
      200,
      "Scheduler status retrieved successfully",
      {
        status: "running",
        jobs: jobsStatus,
        nextRuns: nextRunTimes,
        timestamp: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error("Get scheduler status error:", error);
    return sendErrorResponse(res, 500, "Failed to retrieve scheduler status");
  }
};

// Manually trigger daily tips generation (Admin only)
export const triggerDailyTipsGeneration = async (req, res) => {
  try {
    const adminUid = req.admin.uid;
    const adminEmail = req.admin.email;

    // Log the manual trigger for audit purposes
    await admin.firestore().collection("admin_logs").add({
      action: "MANUAL_TIPS_GENERATION",
      adminUid,
      adminEmail,
      timestamp: FieldValue.serverTimestamp(),
      details: "Manual trigger of daily tips generation",
    });

    // Trigger the generation
    await schedulerService.triggerDailyGeneration();

    return sendSuccessResponse(
      res,
      200,
      "Daily tips generation triggered successfully",
      {
        triggeredBy: adminEmail,
        triggeredAt: new Date().toISOString(),
      }
    );
  } catch (error) {
    console.error("Trigger daily tips generation error:", error);
    return sendErrorResponse(
      res,
      500,
      "Failed to trigger daily tips generation"
    );
  }
};

// Get automation health status (Admin only)
export const getAutomationHealth = async (req, res) => {
  try {
    const schedulerStatus = schedulerService.getJobsStatus();
    const nextRuns = schedulerService.getNextRunTimes();

    // Check if we have tips for today
    const dailyTipsCollection = admin.firestore().collection("dailyTipsPool");
    const today = new Date().toISOString().split("T")[0];
    const todayTipsSnapshot = await dailyTipsCollection.doc(today).get();

    const hasTodayTips =
      todayTipsSnapshot.exists && todayTipsSnapshot.data()?.tips?.length >= 20;

    // Check recent user tip assignments
    const userTipsCollection = admin.firestore().collection("userDailyTips");
    const recentUserTipsSnapshot = await userTipsCollection
      .where("date", "==", today)
      .limit(5)
      .get();

    const hasRecentUserTips = !recentUserTipsSnapshot.empty;

    const healthStatus = {
      overall: "healthy",
      issues: [],
      scheduler: {
        running: schedulerStatus.every((job) => job.running),
        jobs: schedulerStatus,
      },
      dailyTips: {
        available: hasTodayTips,
        count: todayTipsSnapshot.exists
          ? todayTipsSnapshot.data()?.tips?.length || 0
          : 0,
        date: today,
      },
      userTips: {
        hasRecentAssignments: hasRecentUserTips,
        recentCount: recentUserTipsSnapshot.size,
      },
      nextRuns,
    };

    // Determine overall health
    if (!hasTodayTips) {
      healthStatus.overall = "warning";
      healthStatus.issues.push("No tips available for today");
    }

    if (!schedulerStatus.every((job) => job.running)) {
      healthStatus.overall = "error";
      healthStatus.issues.push("Some scheduled jobs are not running");
    }

    if (!hasRecentUserTips && hasTodayTips) {
      healthStatus.overall = "warning";
      healthStatus.issues.push("No recent user tip assignments found");
    }

    return sendSuccessResponse(
      res,
      200,
      "Automation health status retrieved",
      healthStatus
    );
  } catch (error) {
    console.error("Get automation health error:", error);
    return sendErrorResponse(
      res,
      500,
      "Failed to retrieve automation health status"
    );
  }
};
