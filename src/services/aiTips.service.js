import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "../config/firebase.js";

class AITipsService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is required");
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  }

  /**
   * Generate personalized AI tip using onboarding data and past 7 days of daily logs
   */
  async generatePersonalizedTip(userId) {
    try {
      // Get user onboarding data from correct location
      const userDoc = await db.doc(`users/${userId}/onboardingProfile/data`).get();
      if (!userDoc.exists) {
        throw new Error("User onboarding data not found");
      }
      const onboardingData = userDoc.data();

      // Try to get carbon baseline from carbonProfile
      let carbonBaseline = 20; // Default fallback
      try {
        const carbonDoc = await db.doc(`users/${userId}/carbonProfile/baseline`).get();
        if (carbonDoc.exists) {
          const carbonData = carbonDoc.data();
          carbonBaseline = carbonData.totalCarbonFootprint || carbonData.total || 20;
        }
      } catch (carbonError) {
        console.log("Carbon baseline not found, using default");
      }

      // Get past 7 days of daily logs
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

      // Query daily logs for the user (simplified to avoid index requirement)
      const dailyLogsSnapshot = await db
        .collection("dailyLogs")
        .where("userId", "==", userId)
        .limit(20) // Get more than 7 days to filter client-side
        .get();

      // Filter and sort client-side to avoid Firestore index requirement
      const dailyLogs = dailyLogsSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        .filter(log => log.date >= sevenDaysAgoStr)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 7);

      // Generate tip using AI
      const tip = await this.generateTipWithAI(onboardingData, dailyLogs, carbonBaseline);

      // Store tip in Firestore for caching
      const tipId = `tip_${userId}_${Date.now()}`;
      const tipData = {
        tipId,
        userId,
        tip,
        generatedAt: new Date(),
        isRead: false,
        feedback: null,
        basedOnData: {
          onboardingDate: onboardingData.completedAt,
          dailyLogsCount: dailyLogs.length,
          analysisDate: new Date(),
          carbonBaseline: carbonBaseline
        }
      };

      await db.collection("aiTips").doc(tipId).set(tipData);

      return tipData;
    } catch (error) {
      console.error("Error generating personalized tip:", error);
      throw new Error("Failed to generate personalized tip");
    }
  }

  /**
   * Get today's tip from Firestore (check if already generated today)
   */
  async getTodaysTip(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const todayStart = new Date(today);
      
      // Check if tip already generated today (simplified query)
      const tipsSnapshot = await db
        .collection("aiTips")
        .where("userId", "==", userId)
        .limit(10) // Get recent tips and filter client-side
        .get();

      // Filter for today's tips client-side
      const todaysTips = tipsSnapshot.docs
        .map(doc => doc.data())
        .filter(tip => {
          const tipDate = tip.generatedAt.toDate ? tip.generatedAt.toDate() : new Date(tip.generatedAt);
          return tipDate >= todayStart;
        })
        .sort((a, b) => {
          const dateA = a.generatedAt.toDate ? a.generatedAt.toDate() : new Date(a.generatedAt);
          const dateB = b.generatedAt.toDate ? b.generatedAt.toDate() : new Date(b.generatedAt);
          return dateB - dateA;
        });

      if (todaysTips.length > 0) {
        return { tip: todaysTips[0], isNew: false };
      }

      // Generate new tip if none exists for today
      const newTip = await this.generatePersonalizedTip(userId);
      return { tip: newTip, isNew: true };
    } catch (error) {
      console.error("Error getting today's tip:", error);
      throw new Error("Failed to get today's tip");
    }
  }

  /**
   * Generate AI tip based on user data
   */
  async generateTipWithAI(onboardingData, dailyLogs, carbonBaseline = 20) {
    try {
      const prompt = this.buildTipPrompt(onboardingData, dailyLogs, carbonBaseline);

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseTipResponse(text);
    } catch (error) {
      console.error("Error generating AI tip:", error);
      return this.getFallbackTip();
    }
  }

  /**
   * Build prompt for AI tip generation
   */
  buildTipPrompt(onboardingData, dailyLogs, carbonBaseline = 20) {
    const weeklyAnalysis = this.analyzeWeeklyPatterns(dailyLogs);
    
    return `
You are an expert sustainability coach. Generate a personalized daily eco-tip for a user based on their baseline profile and recent activity patterns.

USER BASELINE PROFILE (from onboarding):
Transport: ${JSON.stringify(onboardingData.transport || {}, null, 2)}
Diet: ${JSON.stringify(onboardingData.diet || {}, null, 2)}
Electricity: ${JSON.stringify(onboardingData.electricity || {}, null, 2)}
Lifestyle: ${JSON.stringify(onboardingData.lifestyle || {}, null, 2)}
Baseline Carbon Footprint: ${carbonBaseline} kg CO2e/day
Onboarding Completed: ${onboardingData.completedAt ? new Date(onboardingData.completedAt.seconds * 1000).toLocaleDateString() : 'Unknown'}

RECENT 7-DAY ACTIVITY ANALYSIS:
${weeklyAnalysis.summary}

KEY INSIGHTS:
- Average daily carbon: ${weeklyAnalysis.averageCarbon} kg CO2e
- Trend: ${weeklyAnalysis.trend}
- Highest impact area: ${weeklyAnalysis.highestImpactArea}
- Recent patterns: ${weeklyAnalysis.patterns.join(', ')}

CURRENT CHALLENGES:
${weeklyAnalysis.challenges.length > 0 ? weeklyAnalysis.challenges.join(', ') : 'No specific challenges identified'}

GENERATE A PERSONALIZED TIP THAT:
1. Addresses the user's highest impact area or concerning trend
2. Is actionable and specific to their lifestyle
3. Can be implemented today
4. Provides clear environmental benefit
5. Is encouraging and positive

RESPONSE FORMAT (JSON ONLY):
{
  "title": "Short, catchy tip title (max 50 chars)",
  "message": "Main tip content, actionable and specific (max 200 chars)",
  "category": "transport|diet|electricity|lifestyle|general",
  "impact": "Low|Medium|High",
  "estimatedCO2Reduction": "X.X kg CO2e",
  "actionSteps": [
    "Specific step 1",
    "Specific step 2", 
    "Specific step 3"
  ],
  "whyItMatters": "Brief explanation of environmental impact (max 150 chars)",
  "difficulty": "Easy|Medium|Hard",
  "timeRequired": "X minutes",
  "personalizedReason": "Why this tip is specifically relevant to this user"
}

IMPORTANT:
- Make it personal based on their actual data patterns
- Focus on achievable changes, not overwhelming suggestions
- Use encouraging, non-judgmental language
- Return only valid JSON, no additional text
`;
  }

  /**
   * Analyze weekly patterns from daily logs
   */
  analyzeWeeklyPatterns(dailyLogs) {
    if (!dailyLogs || dailyLogs.length === 0) {
      return {
        summary: "No recent activity data available",
        averageCarbon: 0,
        trend: "Unknown",
        highestImpactArea: "Unknown",
        patterns: [],
        challenges: []
      };
    }

    let totalCarbon = 0;
    let validLogs = 0;
    const categories = { transport: 0, diet: 0, electricity: 0, lifestyle: 0 };
    const patterns = [];
    const challenges = [];

    // Analyze each log
    dailyLogs.forEach((log, index) => {
      if (log.calculatedDailyCarbonFootprint) {
        totalCarbon += log.calculatedDailyCarbonFootprint;
        validLogs++;
      }

      // Analyze specific patterns from the structured questions
      if (log.totalDistanceTraveled === "51plus_km") {
        patterns.push("High travel distance");
        challenges.push("Excessive travel patterns detected");
      }
      
      if (log.primaryTransportMode === "car") {
        categories.transport++;
        patterns.push("Regular car usage");
      }

      if (log.mealsWithMeat >= 3) {
        categories.diet++;
        patterns.push("High meat consumption");
      }

      if (log.acUsageHours === "4_plus") {
        categories.electricity++;
        patterns.push("High AC usage");
        challenges.push("Excessive cooling energy consumption");
      }

      if (log.placedOnlineOrders === true) {
        categories.lifestyle++;
        patterns.push("Online ordering");
      }

      if (log.segregatedWaste === false) {
        challenges.push("Waste segregation opportunity");
      }
    });

    const averageCarbon = validLogs > 0 ? totalCarbon / validLogs : 0;
    
    // Determine trend
    let trend = "Stable";
    if (validLogs >= 3) {
      const recent = dailyLogs.slice(0, 3).reduce((sum, log) => sum + (log.calculatedDailyCarbonFootprint || 0), 0) / 3;
      const older = dailyLogs.slice(3).reduce((sum, log) => sum + (log.calculatedDailyCarbonFootprint || 0), 0) / Math.max(1, dailyLogs.length - 3);
      
      if (recent > older * 1.1) trend = "Increasing";
      else if (recent < older * 0.9) trend = "Decreasing";
    }

    // Find highest impact area
    const highestImpactArea = Object.keys(categories).reduce((a, b) => 
      categories[a] > categories[b] ? a : b
    );

    return {
      summary: `${validLogs} days of data, ${averageCarbon.toFixed(1)} kg CO2e average`,
      averageCarbon: averageCarbon.toFixed(1),
      trend,
      highestImpactArea,
      patterns: [...new Set(patterns)],
      challenges: [...new Set(challenges)]
    };
  }

  /**
   * Parse AI response for tips
   */
  parseTipResponse(responseText) {
    try {
      let cleanText = responseText.trim();
      cleanText = cleanText.replace(/```json\s*/g, "").replace(/```\s*/g, "");

      const jsonStart = cleanText.indexOf("{");
      const jsonEnd = cleanText.lastIndexOf("}") + 1;

      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error("No JSON found in response");
      }

      const jsonStr = cleanText.slice(jsonStart, jsonEnd);
      const parsed = JSON.parse(jsonStr);

      // Validate required fields
      if (!parsed.title || !parsed.message || !parsed.category) {
        throw new Error("Invalid tip structure");
      }

      return {
        ...parsed,
        id: `tip_${Date.now()}`,
        generatedAt: new Date().toISOString(),
        source: "AI Generated"
      };
    } catch (error) {
      console.error("Error parsing tip response:", error);
      return this.getFallbackTip();
    }
  }

  /**
   * Provide feedback on tip helpfulness
   */
  async provideFeedback(tipId, userId, feedback) {
    try {
      const tipDoc = await db.collection("aiTips").doc(tipId).get();
      
      if (!tipDoc.exists) {
        throw new Error("Tip not found");
      }

      if (tipDoc.data().userId !== userId) {
        throw new Error("Unauthorized to provide feedback");
      }

      await db.collection("aiTips").doc(tipId).update({
        feedback: {
          rating: feedback.rating, // 1-5 stars
          helpful: feedback.helpful, // boolean
          comment: feedback.comment || null,
          submittedAt: new Date()
        },
        isRead: true
      });

      return { success: true, message: "Feedback recorded successfully" };
    } catch (error) {
      console.error("Error providing feedback:", error);
      throw new Error("Failed to record feedback");
    }
  }

  /**
   * Get fallback tip when AI generation fails
   */
  getFallbackTip() {
    const fallbackTips = [
      {
        title: "Power Down for the Planet",
        message: "Unplug electronics when not in use - even in standby mode, they consume energy!",
        category: "electricity",
        impact: "Medium",
        estimatedCO2Reduction: "0.5 kg CO2e",
        actionSteps: [
          "Identify devices left plugged in",
          "Unplug chargers, TVs, and appliances",
          "Use power strips with switches"
        ],
        whyItMatters: "Standby power accounts for 10% of household electricity use",
        difficulty: "Easy",
        timeRequired: "5 minutes",
        personalizedReason: "Small actions with big cumulative impact"
      },
      {
        title: "Meatless Monday Impact",
        message: "Replace one meat meal today with a plant-based alternative for instant carbon savings!",
        category: "diet",
        impact: "High",
        estimatedCO2Reduction: "2.5 kg CO2e",
        actionSteps: [
          "Choose a plant-based protein (beans, lentils, tofu)",
          "Try a new vegetarian recipe",
          "Focus on whole foods and vegetables"
        ],
        whyItMatters: "Livestock farming produces 14.5% of global greenhouse gas emissions",
        difficulty: "Easy",
        timeRequired: "30 minutes",
        personalizedReason: "Diet changes have immediate and significant impact"
      },
      {
        title: "Smart Commute Choice",
        message: "Combine errands into one trip or use public transport to slash your travel footprint!",
        category: "transport",
        impact: "High",
        estimatedCO2Reduction: "3.0 kg CO2e",
        actionSteps: [
          "Plan all errands for one outing",
          "Check public transport routes",
          "Consider walking or cycling short distances"
        ],
        whyItMatters: "Transport accounts for 24% of energy-related CO2 emissions globally",
        difficulty: "Medium",
        timeRequired: "10 minutes planning",
        personalizedReason: "Transportation often offers the biggest reduction opportunities"
      }
    ];

    const randomTip = fallbackTips[Math.floor(Math.random() * fallbackTips.length)];
    return {
      ...randomTip,
      id: `fallback_tip_${Date.now()}`,
      generatedAt: new Date().toISOString(),
      source: "Fallback System"
    };
  }
}

export default new AITipsService();
