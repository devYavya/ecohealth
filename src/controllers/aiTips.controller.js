import AITipsService from "../services/aiTips.service.js";
import { sendSuccessResponse, sendErrorResponse } from "../utils/response.js";
import { db } from "../config/firebase.js";

/**
 * Get today's random tip for user from Gemini-generated pool
 */
export const getTodaysTip = async (req, res) => {
  try {
    const { uid } = req.user;

    const tipData = await AITipsService.getRandomTipForUser(uid);

    return sendSuccessResponse(res, 200, "Today's tip retrieved successfully", {
      tipId: tipData.tipId,
      tip: tipData.tip,
      date: tipData.date,
      generatedAt: tipData.generatedAt,
      isRead: tipData.isRead,
      source: tipData.source,
    });
  } catch (error) {
    console.error("Get today's tip error:", error);
    return sendErrorResponse(res, 500, "Failed to get today's tip");
  }
};

/**
 * Generate and store new daily tips using Gemini (Admin/System use)
 */
export const generateDailyTips = async (req, res) => {
  try {
    const result = await AITipsService.generateAndStoreDailyTips();

    return sendSuccessResponse(res, 200, result.message, {
      success: result.success,
      tipsCount: result.tipsCount,
      date: new Date().toISOString().split("T")[0],
    });
  } catch (error) {
    console.error("Generate daily tips error:", error);
    return sendErrorResponse(res, 500, "Failed to generate daily tips");
  }
};

/**
 * Mark tip as read
 */
export const markTipAsRead = async (req, res) => {
  try {
    const { uid } = req.user;
    const { tipId } = req.params;

    const result = await AITipsService.markTipAsRead(tipId, uid);

    return sendSuccessResponse(res, 200, result.message);
  } catch (error) {
    console.error("Mark tip as read error:", error);

    if (error.message.includes("Tip not found")) {
      return sendErrorResponse(res, 404, "Tip not found");
    }

    if (error.message.includes("Unauthorized")) {
      return sendErrorResponse(
        res,
        403,
        "You can only mark your own tips as read"
      );
    }

    return sendErrorResponse(res, 500, "Failed to mark tip as read");
  }
};

/**
 * Get user's tip history
 */
export const getTipHistory = async (req, res) => {
  try {
    const { uid } = req.user;
    const { limit = 10, days = 7 } = req.query;

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    const startDateStr = startDate.toISOString().split("T")[0];

    const snapshot = await db
      .collection("userDailyTips")
      .where("userId", "==", uid)
      .where("date", ">=", startDateStr)
      .orderBy("date", "desc")
      .limit(parseInt(limit))
      .get();

    const tips = snapshot.docs.map((doc) => ({
      tipId: doc.id,
      ...doc.data(),
    }));

    return sendSuccessResponse(res, 200, "Tip history retrieved successfully", {
      tips,
      totalCount: tips.length,
      filters: { days, limit },
    });
  } catch (error) {
    console.error("Get tip history error:", error);
    return sendErrorResponse(res, 500, "Failed to retrieve tip history");
  }
};

/**
 * Get today's tips pool (Admin function)
 */
export const getTodaysTipsPool = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const tipsDoc = await db.collection("dailyTipsPool").doc(today).get();

    if (!tipsDoc.exists) {
      return sendErrorResponse(res, 404, "No tips pool found for today");
    }

    const tipsData = tipsDoc.data();

    return sendSuccessResponse(
      res,
      200,
      "Today's tips pool retrieved successfully",
      {
        date: today,
        tips: tipsData.tips,
        totalTips: tipsData.totalTips,
        generatedAt: tipsData.generatedAt,
      }
    );
  } catch (error) {
    console.error("Get today's tips pool error:", error);
    return sendErrorResponse(res, 500, "Failed to retrieve today's tips pool");
  }
};

/**
 * Clean up old tips (Admin/System function)
 */
export const cleanupOldTips = async (req, res) => {
  try {
    const result = await AITipsService.cleanupOldUserTips();

    return sendSuccessResponse(res, 200, result.message, {
      success: result.success,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Cleanup old tips error:", error);
    return sendErrorResponse(res, 500, "Failed to cleanup old tips");
  }
};
