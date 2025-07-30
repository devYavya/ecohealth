import AITipsService from "../services/aiTips.service.js";
import { sendSuccessResponse, sendErrorResponse } from "../utils/response.js";
import { db } from "../config/firebase.js";

/**
 * Generate a new personalized eco-health tip using Gemini AI
 * Uses onboarding data and past 7 days of daily logs
 */
export const generateTip = async (req, res) => {
  try {
    const { uid } = req.user;

    const tipData = await AITipsService.generatePersonalizedTip(uid);

    return sendSuccessResponse(res, 201, "Personalized tip generated successfully", {
      tip: tipData.tip,
      tipId: tipData.tipId,
      basedOnData: tipData.basedOnData,
      generatedAt: tipData.generatedAt
    });
  } catch (error) {
    console.error("Generate tip error:", error);
    
    if (error.message.includes("onboarding data not found")) {
      return sendErrorResponse(res, 404, "Please complete your onboarding first");
    }

    return sendErrorResponse(res, 500, "Failed to generate personalized tip");
  }
};

/**
 * Get today's tip from cache or generate new one
 */
export const getTodaysTip = async (req, res) => {
  try {
    const { uid } = req.user;

    const result = await AITipsService.getTodaysTip(uid);

    return sendSuccessResponse(res, 200, result.isNew ? "New tip generated" : "Today's tip retrieved", {
      tip: result.tip.tip,
      tipId: result.tip.tipId,
      isNew: result.isNew,
      generatedAt: result.tip.generatedAt,
      basedOnData: result.tip.basedOnData
    });
  } catch (error) {
    console.error("Get today's tip error:", error);
    
    if (error.message.includes("onboarding data not found")) {
      return sendErrorResponse(res, 404, "Please complete your onboarding first to get personalized tips");
    }

    return sendErrorResponse(res, 500, "Failed to get today's tip");
  }
};

/**
 * Provide feedback on tip helpfulness
 */
export const provideFeedback = async (req, res) => {
  try {
    const { uid } = req.user;
    const { tipId } = req.params;
    const { rating, helpful, comment } = req.body;

    // Validate feedback data
    if (rating && (rating < 1 || rating > 5)) {
      return sendErrorResponse(res, 400, "Rating must be between 1 and 5");
    }

    if (helpful !== undefined && typeof helpful !== 'boolean') {
      return sendErrorResponse(res, 400, "Helpful field must be a boolean");
    }

    const feedback = { rating, helpful, comment };
    const result = await AITipsService.provideFeedback(tipId, uid, feedback);

    return sendSuccessResponse(res, 200, "Feedback recorded successfully", result);
  } catch (error) {
    console.error("Provide feedback error:", error);
    
    if (error.message.includes("Tip not found")) {
      return sendErrorResponse(res, 404, "Tip not found");
    }

    if (error.message.includes("Unauthorized")) {
      return sendErrorResponse(res, 403, "You can only provide feedback on your own tips");
    }

    return sendErrorResponse(res, 500, "Failed to record feedback");
  }
};

/**
 * Get user's tip history with optional filtering
 */
export const getTipHistory = async (req, res) => {
  try {
    const { uid } = req.user;
    const { limit = 10, category, days = 30 } = req.query;

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    let query = db
      .collection("aiTips")
      .where("userId", "==", uid)
      .where("generatedAt", ">=", startDate)
      .orderBy("generatedAt", "desc")
      .limit(parseInt(limit));

    // Add category filter if provided
    if (category && ['transport', 'diet', 'electricity', 'lifestyle', 'general'].includes(category)) {
      query = query.where("tip.category", "==", category);
    }

    const snapshot = await query.get();
    const tips = snapshot.docs.map(doc => ({
      tipId: doc.id,
      ...doc.data()
    }));

    return sendSuccessResponse(res, 200, "Tip history retrieved successfully", {
      tips,
      totalCount: tips.length,
      filters: { category, days, limit }
    });
  } catch (error) {
    console.error("Get tip history error:", error);
    return sendErrorResponse(res, 500, "Failed to retrieve tip history");
  }
};

/**
 * Get tip analytics for user (engagement metrics)
 */
export const getTipAnalytics = async (req, res) => {
  try {
    const { uid } = req.user;
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const snapshot = await db
      .collection("aiTips")
      .where("userId", "==", uid)
      .where("generatedAt", ">=", startDate)
      .get();

    const tips = snapshot.docs.map(doc => doc.data());

    // Calculate analytics
    const analytics = {
      totalTips: tips.length,
      tipsWithFeedback: tips.filter(tip => tip.feedback).length,
      averageRating: 0,
      helpfulTips: tips.filter(tip => tip.feedback && tip.feedback.helpful).length,
      categoryBreakdown: {},
      impactBreakdown: {},
      readTips: tips.filter(tip => tip.isRead).length,
      dateRange: { start: startDate.toISOString(), end: new Date().toISOString() }
    };

    // Calculate average rating
    const ratingsWithFeedback = tips.filter(tip => tip.feedback && tip.feedback.rating);
    if (ratingsWithFeedback.length > 0) {
      analytics.averageRating = ratingsWithFeedback.reduce((sum, tip) => sum + tip.feedback.rating, 0) / ratingsWithFeedback.length;
    }

    // Category and impact breakdown
    tips.forEach(tip => {
      const category = tip.tip?.category || 'unknown';
      const impact = tip.tip?.impact || 'unknown';
      
      analytics.categoryBreakdown[category] = (analytics.categoryBreakdown[category] || 0) + 1;
      analytics.impactBreakdown[impact] = (analytics.impactBreakdown[impact] || 0) + 1;
    });

    return sendSuccessResponse(res, 200, "Tip analytics retrieved successfully", analytics);
  } catch (error) {
    console.error("Get tip analytics error:", error);
    return sendErrorResponse(res, 500, "Failed to retrieve tip analytics");
  }
};

/**
 * Mark tip as read
 */
export const markTipAsRead = async (req, res) => {
  try {
    const { uid } = req.user;
    const { tipId } = req.params;

    const tipDoc = await db.collection("aiTips").doc(tipId).get();
    
    if (!tipDoc.exists) {
      return sendErrorResponse(res, 404, "Tip not found");
    }

    if (tipDoc.data().userId !== uid) {
      return sendErrorResponse(res, 403, "Unauthorized to mark this tip as read");
    }

    await db.collection("aiTips").doc(tipId).update({
      isRead: true,
      readAt: new Date()
    });

    return sendSuccessResponse(res, 200, "Tip marked as read");
  } catch (error) {
    console.error("Mark tip as read error:", error);
    return sendErrorResponse(res, 500, "Failed to mark tip as read");
  }
};
