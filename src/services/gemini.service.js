import { GoogleGenerativeAI } from "@google/generative-ai";

class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is required");
    }
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  }

  async generatePersonalizedChallenges(
    userProfile,
    recentDailyLogs,
    currentCarbonFootprint
  ) {
    try {
      const prompt = this.buildChallengePrompt(
        userProfile,
        recentDailyLogs,
        currentCarbonFootprint
      );

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Parse the JSON response from Gemini
      return this.parseChallengeResponse(text);
    } catch (error) {
      console.error("Error generating personalized challenges:", error);
      throw new Error("Failed to generate personalized challenges");
    }
  }

  buildChallengePrompt(userProfile, recentDailyLogs, currentCarbonFootprint) {
    const averageCarbonFootprint = currentCarbonFootprint.total || 20;
    const carbonCategory = this.getCarbonCategory(averageCarbonFootprint);

    return `
You are an AI sustainability coach. Generate 3 personalized weekly challenges for a user based on their profile and recent activity. 

USER PROFILE:
Transport: ${JSON.stringify(userProfile.transport, null, 2)}
Diet: ${JSON.stringify(userProfile.diet, null, 2)}
Electricity: ${JSON.stringify(userProfile.electricity, null, 2)}
Lifestyle: ${JSON.stringify(userProfile.lifestyle, null, 2)}

CURRENT CARBON FOOTPRINT: ${averageCarbonFootprint} kg CO2e/day (${carbonCategory})
BREAKDOWN: ${JSON.stringify(currentCarbonFootprint.breakdown, null, 2)}

RECENT ACTIVITY PATTERNS:
${this.summarizeRecentLogs(recentDailyLogs)}

CHALLENGE REQUIREMENTS:
1. Generate exactly 3 challenges targeting the user's highest carbon emission areas
2. Challenges should be achievable but meaningful (5-20% improvement)
3. Mix different types: diet, transport, electricity, lifestyle
4. Each challenge should run for 7 days
5. Points awarded: 10-50 based on difficulty and impact
6. Include specific, measurable criteria

RESPONSE FORMAT (JSON ONLY):
{
  "challenges": [
    {
      "name": "Challenge Name",
      "description": "Detailed description with specific goals",
      "type": "diet|transport|electricity|lifestyle",
      "difficulty": "easy|medium|hard",
      "duration": 7,
      "pointsAwarded": 25,
      "badgeAwarded": "Badge Name",
      "criteria": {
        "specificCondition": "value",
        "targetReduction": "percentage or amount"
      },
      "tips": [
        "Practical tip 1",
        "Practical tip 2",
        "Practical tip 3"
      ],
      "expectedImpact": "X kg CO2e reduction per week"
    }
  ]
}

IMPORTANT: 
- Focus on the user's highest emission categories
- Make challenges realistic based on their current habits
- Provide actionable, specific criteria
- Consider their lifestyle constraints (work from home, commute distance, etc.)
- Return only valid JSON, no additional text
`;
  }

  summarizeRecentLogs(recentLogs) {
    if (!recentLogs || recentLogs.length === 0) {
      return "No recent daily logs available";
    }

    const summary = {
      totalLogs: recentLogs.length,
      averageCarbon: 0,
      patterns: [],
    };

    let totalCarbon = 0;
    const transportModes = {};
    const dietPatterns = {};

    recentLogs.forEach((log) => {
      if (log.calculatedDailyCarbonFootprint) {
        totalCarbon += log.calculatedDailyCarbonFootprint;
      }

      // Analyze patterns from overrides
      if (log.overrides) {
        if (log.overrides.transport) {
          Object.keys(log.overrides.transport).forEach((key) => {
            transportModes[key] = (transportModes[key] || 0) + 1;
          });
        }
        if (log.overrides.diet) {
          Object.keys(log.overrides.diet).forEach((key) => {
            dietPatterns[key] = (dietPatterns[key] || 0) + 1;
          });
        }
      }
    });

    summary.averageCarbon =
      summary.totalLogs > 0 ? totalCarbon / summary.totalLogs : 0;
    summary.patterns.push(
      `Average daily carbon: ${summary.averageCarbon.toFixed(1)} kg CO2e`
    );

    if (Object.keys(transportModes).length > 0) {
      summary.patterns.push(
        `Transport patterns: ${JSON.stringify(transportModes)}`
      );
    }
    if (Object.keys(dietPatterns).length > 0) {
      summary.patterns.push(`Diet patterns: ${JSON.stringify(dietPatterns)}`);
    }

    return summary.patterns.join(". ");
  }

  getCarbonCategory(carbonFootprint) {
    if (carbonFootprint < 10) return "Low Impact";
    if (carbonFootprint < 20) return "Moderate Impact";
    if (carbonFootprint < 30) return "High Impact";
    return "Very High Impact";
  }

  parseChallengeResponse(responseText) {
    try {
      // Clean up the response text to extract JSON
      let cleanText = responseText.trim();

      // Remove any markdown code blocks
      cleanText = cleanText.replace(/```json\s*/g, "").replace(/```\s*/g, "");

      // Find the JSON object
      const jsonStart = cleanText.indexOf("{");
      const jsonEnd = cleanText.lastIndexOf("}") + 1;

      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error("No JSON found in response");
      }

      const jsonStr = cleanText.slice(jsonStart, jsonEnd);
      const parsed = JSON.parse(jsonStr);

      // Validate the structure
      if (!parsed.challenges || !Array.isArray(parsed.challenges)) {
        throw new Error("Invalid challenge structure");
      }

      // Add unique IDs and timestamps to challenges
      const processedChallenges = parsed.challenges.map((challenge, index) => ({
        challengeId: `personalized_${Date.now()}_${index}`,
        ...challenge,
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        isPersonalized: true,
        createdAt: new Date(),
      }));

      return { challenges: processedChallenges };
    } catch (error) {
      console.error("Error parsing Gemini response:", error);
      console.error("Raw response:", responseText);

      // Return fallback challenges if parsing fails
      return this.getFallbackChallenges();
    }
  }

  getFallbackChallenges() {
    return {
      challenges: [
        {
          challengeId: `fallback_${Date.now()}_1`,
          name: "Carbon Footprint Awareness Week",
          description:
            "Track your daily carbon footprint and identify one area for improvement each day",
          type: "lifestyle",
          difficulty: "easy",
          duration: 7,
          pointsAwarded: 20,
          badgeAwarded: "Carbon Tracker",
          criteria: {
            dailyLogging: 5,
            targetReduction: "5%",
          },
          tips: [
            "Log your daily activities consistently",
            "Focus on small, achievable changes",
            "Compare your footprint day by day",
          ],
          expectedImpact: "1-2 kg CO2e reduction per week",
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isPersonalized: true,
          createdAt: new Date(),
        },
        {
          challengeId: `fallback_${Date.now()}_2`,
          name: "Plant-Based Meal Challenge",
          description:
            "Replace 3 meat-based meals with plant-based alternatives this week",
          type: "diet",
          difficulty: "medium",
          duration: 7,
          pointsAwarded: 30,
          badgeAwarded: "Plant Pioneer",
          criteria: {
            plantBasedMeals: 3,
            meatReduction: "30%",
          },
          tips: [
            "Try new plant-based recipes",
            "Focus on protein-rich alternatives",
            "Start with one meal per day",
          ],
          expectedImpact: "3-5 kg CO2e reduction per week",
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isPersonalized: true,
          createdAt: new Date(),
        },
        {
          challengeId: `fallback_${Date.now()}_3`,
          name: "Energy Saver Challenge",
          description:
            "Reduce your electricity usage by 15% through mindful appliance use",
          type: "electricity",
          difficulty: "medium",
          duration: 7,
          pointsAwarded: 25,
          badgeAwarded: "Energy Saver",
          criteria: {
            electricityReduction: "15%",
            mindfulUsage: true,
          },
          tips: [
            "Unplug devices when not in use",
            "Use natural light during the day",
            "Optimize AC temperature settings",
          ],
          expectedImpact: "2-4 kg CO2e reduction per week",
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isPersonalized: true,
          createdAt: new Date(),
        },
      ],
    };
  }
}

export default new GeminiService();
