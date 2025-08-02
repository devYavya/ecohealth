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
   * Generate 25 AI-powered tips using Gemini and store in database
   */
  async generateAndStoreDailyTips() {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Check if tips already exist for today
      const existingTipsQuery = await db
        .collection("dailyTipsPool")
        .where("date", "==", today)
        .limit(1)
        .get();

      if (!existingTipsQuery.empty) {
        console.log("Tips already generated for today");
        return { success: true, message: "Tips already exist for today" };
      }

      // Delete previous day's tips
      await this.deletePreviousTips();

      // Generate new tips using Gemini
      const tipsArray = await this.generateTipsWithGemini();

      // Store tips in database
      const batch = db.batch();
      const tipsData = {
        date: today,
        tips: tipsArray,
        generatedAt: new Date(),
        totalTips: tipsArray.length,
      };

      const docRef = db.collection("dailyTipsPool").doc(today);
      batch.set(docRef, tipsData);

      await batch.commit();

      console.log(`Generated and stored ${tipsArray.length} tips for ${today}`);
      return {
        success: true,
        message: `Generated ${tipsArray.length} new tips for today`,
        tipsCount: tipsArray.length,
      };
    } catch (error) {
      console.error("Error generating and storing daily tips:", error);
      throw new Error("Failed to generate daily tips");
    }
  }

  /**
   * Use Gemini AI to generate 25 diverse tips
   */
  async generateTipsWithGemini() {
    try {
      const prompt = this.buildTipsGenerationPrompt();

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return this.parseTipsResponse(text);
    } catch (error) {
      console.error("Error generating tips with Gemini:", error);
      // Return fallback tips if Gemini fails
      return this.getFallbackTips();
    }
  }

  /**
   * Build prompt for generating 25 diverse tips
   */
  buildTipsGenerationPrompt() {
    return `
You are an expert sustainability coach. Generate exactly 25 diverse daily eco-tips covering transport, diet, electricity, and lifestyle categories.

Each tip set should contain practical, actionable advice for reducing carbon footprint with specific environmental impact data.

REQUIREMENTS:
1. Generate exactly 25 tip objects
2. Each object must have exactly 4 properties: transport, diet, electricity, lifestyle
3. Each tip should be specific and actionable
4. Include quantified environmental benefits (kg CO2e savings when possible)
5. Tips should be diverse and cover different scenarios
6. Make them practical for everyday implementation
7. Use encouraging, positive language

RESPONSE FORMAT (JSON ONLY):
{
  "tips": [
    {
      "transport": "Walk or bike for trips under 2km to reduce carbon emissions by 1.2kg CO2e per day",
      "diet": "Choose plant-based proteins like lentils or chickpeas for one meal to save 2.5kg CO2e",
      "electricity": "Unplug chargers and electronics when not in use to reduce standby power consumption",
      "lifestyle": "Use a reusable water bottle instead of buying plastic bottles to prevent 0.5kg CO2e daily"
    },
    {
      "transport": "Use public transport once this week to reduce your carbon footprint by 4.6kg CO2e per trip",
      "diet": "Try 'Meatless Monday' - replace red meat with vegetables to save 6.1kg CO2e per meal",
      "electricity": "Set your AC to 24°C instead of 20°C to reduce energy consumption by 30%",
      "lifestyle": "Buy local produce from farmers markets to reduce transportation emissions by 0.8kg CO2e"
    }
  ]
}

IMPORTANT:
- Return exactly 25 tip objects in the tips array
- Each tip should be unique and diverse
- Focus on actionable steps people can take today
- Include specific carbon savings when possible
- Return only valid JSON, no additional text
- Cover a wide range of sustainability topics within each category
`;
  }

  /**
   * Parse Gemini response for tips
   */
  parseTipsResponse(responseText) {
    try {
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
      if (!parsed.tips || !Array.isArray(parsed.tips)) {
        throw new Error("Invalid tips structure");
      }

      // Validate each tip has required properties
      const validTips = parsed.tips.filter(
        (tip) => tip.transport && tip.diet && tip.electricity && tip.lifestyle
      );

      if (validTips.length < 20) {
        console.warn("Less than 20 valid tips generated, using fallback");
        return this.getFallbackTips();
      }

      // Ensure we have exactly 25 tips
      while (validTips.length < 25 && validTips.length > 0) {
        const randomTip =
          validTips[Math.floor(Math.random() * validTips.length)];
        validTips.push(randomTip);
      }

      return validTips.slice(0, 25);
    } catch (error) {
      console.error("Error parsing tips response:", error);
      return this.getFallbackTips();
    }
  }

  /**
   * Get fallback tips when Gemini generation fails
   */
  getFallbackTips() {
    return [
      {
        transport:
          "Walk or bike for trips under 2km to reduce carbon emissions by 1.2kg CO2e per day",
        diet: "Choose plant-based proteins like lentils or chickpeas for one meal to save 2.5kg CO2e",
        electricity:
          "Unplug chargers and electronics when not in use to reduce standby power consumption",
        lifestyle:
          "Use a reusable water bottle instead of buying plastic bottles to prevent 0.5kg CO2e daily",
      },
      {
        transport:
          "Use public transport once this week to reduce your carbon footprint by 4.6kg CO2e per trip",
        diet: "Try 'Meatless Monday' - replace red meat with vegetables to save 6.1kg CO2e per meal",
        electricity:
          "Set your AC to 24°C instead of 20°C to reduce energy consumption by 30%",
        lifestyle:
          "Buy local produce from farmers markets to reduce transportation emissions by 0.8kg CO2e",
      },
      {
        transport:
          "Combine multiple errands into one car trip to reduce fuel consumption and emissions",
        diet: "Choose seasonal fruits and vegetables to reduce agricultural carbon footprint by 1.1kg CO2e",
        electricity:
          "Switch to LED bulbs which use 75% less energy than incandescent bulbs",
        lifestyle:
          "Repair items instead of buying new ones to prevent 2.3kg CO2e from manufacturing",
      },
      {
        transport:
          "Work from home one day per week to avoid commute emissions of 4.2kg CO2e",
        diet: "Reduce food waste by planning meals - prevents 1.8kg CO2e from decomposing organic waste",
        electricity:
          "Use natural light during day and turn off unnecessary lights to save 0.4kg CO2e daily",
        lifestyle:
          "Choose second-hand clothes over new ones to avoid 8.1kg CO2e from textile production",
      },
      {
        transport:
          "Carpool with colleagues to reduce individual transport emissions by 50% per trip",
        diet: "Drink tap water instead of bottled water to prevent 0.3kg CO2e from packaging and transport",
        electricity:
          "Wash clothes in cold water to reduce energy use by 90% and save 1.2kg CO2e per load",
        lifestyle:
          "Use digital receipts instead of paper to save trees and reduce 0.1kg CO2e per receipt",
      },
      {
        transport:
          "Keep your car tires properly inflated to improve fuel efficiency by 3% and reduce emissions",
        diet: "Eat locally sourced honey instead of imported sweeteners to reduce transport emissions",
        electricity:
          "Air dry clothes instead of using dryer to save 2.3kg CO2e per load",
        lifestyle:
          "Bring your own bags when shopping to prevent plastic production emissions of 0.2kg CO2e",
      },
      {
        transport:
          "Plan routes efficiently using GPS to reduce unnecessary driving and fuel consumption",
        diet: "Choose grass-fed beef over grain-fed to reduce methane emissions by 1.4kg CO2e per serving",
        electricity:
          "Use a programmable thermostat to optimize heating/cooling and save 8% energy consumption",
        lifestyle:
          "Share books, tools, and equipment with neighbors instead of buying new items",
      },
      {
        transport:
          "Use video calls instead of traveling for meetings to prevent 5.7kg CO2e per avoided trip",
        diet: "Compost food scraps to prevent methane emissions and create natural fertilizer",
        electricity:
          "Unplug your TV when not watching to save phantom load energy consumption",
        lifestyle:
          "Choose refillable pens over disposable ones to reduce plastic waste by 0.05kg CO2e each",
      },
      {
        transport:
          "Service your vehicle regularly to maintain optimal fuel efficiency and reduce emissions",
        diet: "Buy organic produce when possible to support carbon-sequestering farming practices",
        electricity:
          "Use energy-efficient appliances rated 5-star to reduce electricity consumption by 25%",
        lifestyle:
          "Print double-sided documents to reduce paper consumption and save 0.3kg CO2e per page",
      },
      {
        transport:
          "Walk up stairs instead of using elevators to save electricity and reduce 0.1kg CO2e per floor",
        diet: "Choose wild-caught fish over farmed fish to reduce aquaculture carbon emissions",
        electricity:
          "Close curtains during hot days to reduce AC load and save 1.5kg CO2e daily",
        lifestyle:
          "Use rechargeable batteries instead of disposables to prevent 0.4kg CO2e per battery",
      },
      {
        transport:
          "Use cruise control on highways to maintain steady speed and improve fuel efficiency by 7%",
        diet: "Reduce portion sizes to minimize food waste and associated carbon emissions",
        electricity:
          "Turn off computer monitors when stepping away to save 0.2kg CO2e per day",
        lifestyle:
          "Choose bamboo products over plastic alternatives to support sustainable materials",
      },
      {
        transport:
          "Remove excess weight from your car to improve fuel efficiency by 1-2% per 45kg removed",
        diet: "Choose plant-based milk alternatives to reduce dairy farming emissions by 1.9kg CO2e per liter",
        electricity:
          "Use fans along with AC to circulate air and reduce cooling energy by 20%",
        lifestyle:
          "Buy products with minimal packaging to reduce manufacturing and disposal emissions",
      },
      {
        transport:
          "Combine car trips with family members to reduce individual carbon footprint per journey",
        diet: "Preserve food properly to extend shelf life and reduce waste by 0.6kg CO2e per item saved",
        electricity:
          "Set water heater to 60°C instead of 70°C to reduce energy consumption by 15%",
        lifestyle:
          "Use cloth napkins instead of paper napkins to save 0.08kg CO2e per meal",
      },
      {
        transport:
          "Check traffic apps before leaving to avoid congestion and reduce idle time emissions",
        diet: "Cook larger portions and freeze leftovers to reduce cooking energy per meal",
        electricity:
          "Clean AC filters monthly to maintain efficiency and reduce energy consumption by 10%",
        lifestyle:
          "Choose concentrated cleaning products to reduce packaging and transport emissions",
      },
      {
        transport:
          "Use bike lanes and cycling infrastructure for safe, emission-free short-distance travel",
        diet: "Buy imperfect fruits and vegetables to prevent food waste and support efficient farming",
        electricity:
          "Use sleep mode on computers and laptops to reduce standby power consumption",
        lifestyle:
          "Donate unused items instead of throwing away to extend product lifecycle",
      },
      {
        transport:
          "Consider electric or hybrid vehicles for your next car purchase to reduce lifetime emissions",
        diet: "Grow herbs on your windowsill to reduce packaging and transport of store-bought herbs",
        electricity:
          "Use timer switches for outdoor lighting to avoid unnecessary energy consumption",
        lifestyle:
          "Choose experiences over material gifts to reduce manufacturing and packaging emissions",
      },
      {
        transport:
          "Walk to nearby destinations instead of driving to reduce emissions and improve health",
        diet: "Choose whole grains over processed foods to reduce manufacturing energy consumption",
        electricity:
          "Keep refrigerator and freezer well-stocked but not overcrowded for optimal efficiency",
        lifestyle:
          "Use library services for books, movies, and resources instead of purchasing new items",
      },
      {
        transport:
          "Use train travel instead of flights for medium-distance trips to reduce emissions by 80%",
        diet: "Make coffee at home instead of buying takeaway to reduce cup waste and transport emissions",
        electricity:
          "Close doors to unused rooms to reduce heating and cooling energy requirements",
        lifestyle:
          "Choose wooden toys over plastic ones for children to support sustainable materials",
      },
      {
        transport:
          "Maintain steady acceleration and avoid aggressive driving to improve fuel efficiency by 15%",
        diet: "Use all parts of vegetables including stems and leaves to minimize food waste",
        electricity:
          "Use task lighting instead of overhead lighting to reduce energy consumption by 60%",
        lifestyle:
          "Choose bar soap over liquid soap to reduce plastic packaging by 0.15kg CO2e per bar",
      },
      {
        transport:
          "Use park-and-ride facilities to combine car and public transport efficiently",
        diet: "Choose foods with longer shelf life to reduce frequency of shopping trips",
        electricity:
          "Install weather stripping around doors and windows to reduce heating/cooling losses",
        lifestyle:
          "Use mesh bags for fruits and vegetables instead of plastic bags at grocery stores",
      },
      {
        transport:
          "Consider car-sharing services for occasional trips instead of owning a second vehicle",
        diet: "Eat smaller portions of meat and larger portions of vegetables to balance nutrition and emissions",
        electricity:
          "Use motion sensor lights in bathrooms and corridors to save electricity automatically",
        lifestyle:
          "Choose quality items that last longer over cheap disposable alternatives",
      },
      {
        transport:
          "Use electric scooters or e-bikes for medium-distance trips in urban areas",
        diet: "Choose frozen vegetables over fresh when cooking at home to reduce food waste",
        electricity:
          "Keep curtains and blinds closed during winter nights to retain heat naturally",
        lifestyle:
          "Use refillable containers for bulk shopping to reduce packaging waste",
      },
      {
        transport:
          "Plan shopping trips to reduce frequency of car use and consolidate errands efficiently",
        diet: "Choose fish from sustainable fisheries to support ocean conservation and reduce overfishing",
        electricity:
          "Use power strips to easily turn off multiple devices and eliminate phantom loads",
        lifestyle:
          "Choose digital magazines and newspapers over printed versions to save paper",
      },
      {
        transport:
          "Use taxi or ride-sharing for occasional trips instead of maintaining a personal vehicle",
        diet: "Make your own snacks instead of buying packaged ones to reduce processing emissions",
        electricity:
          "Set washing machine to eco-mode to reduce water heating energy by 25%",
        lifestyle:
          "Use video streaming instead of buying physical DVDs to reduce manufacturing emissions",
      },
      {
        transport:
          "Choose direct routes and avoid unnecessary detours to minimize fuel consumption",
        diet: "Choose loose leaf tea over tea bags to reduce packaging and processing emissions",
        electricity:
          "Use timers for electrical appliances to prevent accidentally leaving them on",
        lifestyle:
          "Choose refurbished electronics over new ones to reduce manufacturing carbon footprint",
      },
    ];
  }

  /**
   * Delete previous day's tips from database
   */
  async deletePreviousTips() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      // Delete tips pool for previous days
      const oldTipsSnapshot = await db
        .collection("dailyTipsPool")
        .where("date", "<", yesterdayStr)
        .get();

      const batch = db.batch();
      oldTipsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      if (!oldTipsSnapshot.empty) {
        await batch.commit();
        console.log(`Deleted ${oldTipsSnapshot.docs.length} old tip pools`);
      }

      return { success: true, deletedCount: oldTipsSnapshot.docs.length };
    } catch (error) {
      console.error("Error deleting previous tips:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get today's tips from database
   */
  async getTodaysTipsFromDB() {
    try {
      const today = new Date().toISOString().split("T")[0];

      const tipsDoc = await db.collection("dailyTipsPool").doc(today).get();

      if (tipsDoc.exists) {
        return tipsDoc.data().tips;
      }

      // If no tips for today, generate them
      await this.generateAndStoreDailyTips();

      // Try again
      const newTipsDoc = await db.collection("dailyTipsPool").doc(today).get();

      return newTipsDoc.exists
        ? newTipsDoc.data().tips
        : this.getFallbackTips();
    } catch (error) {
      console.error("Error getting today's tips from DB:", error);
      return this.getFallbackTips();
    }
  }

  /**
   * Get a random tip for a specific user from today's pool
   */
  async getRandomTipForUser(userId) {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Check if user already has a tip for today
      const existingTipQuery = await db
        .collection("userDailyTips")
        .where("userId", "==", userId)
        .where("date", "==", today)
        .limit(1)
        .get();

      if (!existingTipQuery.empty) {
        return existingTipQuery.docs[0].data();
      }

      // Get today's tips pool
      const todaysTips = await this.getTodaysTipsFromDB();

      // Create a better random selection based on userId and date
      const randomIndex = this.getUserSpecificTipIndex(
        userId,
        today,
        todaysTips.length
      );
      const selectedTip = todaysTips[randomIndex];

      // Store the tip for the user
      const userTipData = {
        tipId: `daily_tip_${userId}_${today}`,
        userId,
        date: today,
        tip: selectedTip,
        tipIndex: randomIndex,
        generatedAt: new Date(),
        isRead: false,
        source: "Gemini Generated Daily Tips",
      };

      await db
        .collection("userDailyTips")
        .doc(userTipData.tipId)
        .set(userTipData);

      return userTipData;
    } catch (error) {
      console.error("Error getting random tip for user:", error);
      // Return fallback tip if database fails
      const fallbackTips = this.getFallbackTips();
      const randomIndex = this.getUserSpecificTipIndex(
        userId,
        new Date().toISOString().split("T")[0],
        fallbackTips.length
      );

      return {
        tipId: `fallback_tip_${userId}_${Date.now()}`,
        userId,
        date: new Date().toISOString().split("T")[0],
        tip: fallbackTips[randomIndex],
        tipIndex: randomIndex,
        generatedAt: new Date(),
        isRead: false,
        source: "Fallback Tips",
      };
    }
  }

  /**
   * Get user-specific tip index using improved randomization
   */
  getUserSpecificTipIndex(userId, date, maxIndex) {
    // Create multiple hash values to get better distribution
    const hash1 = this.djb2Hash(userId);
    const hash2 = this.djb2Hash(date);
    const hash3 = this.djb2Hash(userId + date + "ecohealth_salt_2025");

    // Add some additional entropy based on userId length and character codes
    const userIdSum = userId
      .split("")
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const dateSum = date
      .split("")
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);

    // Combine hashes for better randomness
    const combinedHash =
      (hash1 * 31 + hash2 * 17 + hash3 * 13 + userIdSum * 7 + dateSum * 11) >>>
      0;

    // Use modulo to get index within range
    return combinedHash % maxIndex;
  }

  /**
   * DJB2 hash function for better distribution
   */
  djb2Hash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
    }
    return hash;
  }

  /**
   * Create a simple seed for pseudo-random selection (legacy - keeping for compatibility)
   */
  createSeed(str) {
    return this.djb2Hash(str);
  }

  /**
   * Mark tip as read
   */
  async markTipAsRead(tipId, userId) {
    try {
      const tipDoc = await db.collection("userDailyTips").doc(tipId).get();

      if (!tipDoc.exists) {
        throw new Error("Tip not found");
      }

      if (tipDoc.data().userId !== userId) {
        throw new Error("Unauthorized to mark tip as read");
      }

      await db.collection("userDailyTips").doc(tipId).update({
        isRead: true,
        readAt: new Date(),
      });

      return { success: true, message: "Tip marked as read" };
    } catch (error) {
      console.error("Error marking tip as read:", error);
      throw new Error("Failed to mark tip as read");
    }
  }

  /**
   * Clean up old user tips (run daily to keep database clean)
   */
  async cleanupOldUserTips() {
    try {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const threeDaysAgoStr = threeDaysAgo.toISOString().split("T")[0];

      const oldTipsSnapshot = await db
        .collection("userDailyTips")
        .where("date", "<", threeDaysAgoStr)
        .limit(100) // Process in batches
        .get();

      const batch = db.batch();
      let deleteCount = 0;

      oldTipsSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deleteCount++;
      });

      if (deleteCount > 0) {
        await batch.commit();
      }

      return {
        success: true,
        message: `Cleaned up ${deleteCount} old user tips from database`,
        deletedCount: deleteCount,
      };
    } catch (error) {
      console.error("Error cleaning up old user tips:", error);
      return { success: false, message: "Failed to clean up old user tips" };
    }
  }
}

export default new AITipsService();
