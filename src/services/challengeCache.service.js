import { admin } from "../config/firebase.js";
import geminiService from "./gemini.service.js";
import crypto from "crypto";

class ChallengeCacheService {
  constructor() {
    this.db = admin.firestore();
  }

  // Generate profile hash to detect changes
  generateProfileHash(userProfile, carbonFootprint) {
    const profileString = JSON.stringify({
      transport: userProfile.transport,
      diet: userProfile.diet,
      electricity: userProfile.electricity,
      lifestyle: userProfile.lifestyle,
      carbonFootprint: Math.round(carbonFootprint)
    });
    return crypto.createHash('md5').update(profileString).digest('hex');
  }

  async getCachedChallenges(userId, userProfile, carbonFootprint) {
    try {
      const currentProfileHash = this.generateProfileHash(userProfile, carbonFootprint);
      
      // Check for cached challenges
      const cacheRef = this.db.collection('personalizedChallenges').doc(userId);
      const cacheDoc = await cacheRef.get();
      
      if (cacheDoc.exists) {
        const cacheData = cacheDoc.data();
        const isExpired = Date.now() > cacheData.expiresAt.toMillis();
        const profileChanged = cacheData.profileHash !== currentProfileHash;
        const carbonFootprintChanged = Math.abs(cacheData.carbonFootprintSnapshot - carbonFootprint) > (carbonFootprint * 0.2);
        
        // Return cached challenges if still valid
        if (!isExpired && !profileChanged && !carbonFootprintChanged) {
          console.log('✅ Using cached personalized challenges');
          return {
            challenges: cacheData.challenges,
            fromCache: true,
            cacheAge: Date.now() - cacheData.generatedAt.toMillis()
          };
        }
        
        console.log('🔄 Cache invalidated:', { isExpired, profileChanged, carbonFootprintChanged });
      }

      // Generate new challenges via Gemini API
      console.log('🤖 Generating new personalized challenges via Gemini');
      return await this.generateAndCacheChallenges(userId, userProfile, carbonFootprint, currentProfileHash);
      
    } catch (error) {
      console.error('Error in challenge cache service:', error);
      // Return fallback challenges if everything fails
      return geminiService.getFallbackChallenges();
    }
  }

  async generateAndCacheChallenges(userId, userProfile, carbonFootprint, profileHash) {
    try {
      // Get recent daily logs for context
      const logsRef = this.db.collection('users').doc(userId).collection('dailyLogs');
      const recentLogs = await logsRef.orderBy('logDate', 'desc').limit(7).get();
      const recentLogsData = recentLogs.docs.map(doc => doc.data());

      // Generate challenges via Gemini
      const geminiResult = await geminiService.generatePersonalizedChallenges(
        userProfile,
        recentLogsData,
        { total: carbonFootprint, breakdown: {} }
      );

      // Cache the results
      const cacheData = {
        challenges: geminiResult.challenges,
        profileHash,
        carbonFootprintSnapshot: carbonFootprint,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks
        apiCallCount: admin.firestore.FieldValue.increment(1)
      };

      await this.db.collection('personalizedChallenges').doc(userId).set(cacheData);

      return {
        challenges: geminiResult.challenges,
        fromCache: false,
        generated: true
      };

    } catch (error) {
      console.error('Error generating challenges:', error);
      // Fallback to static challenges
      return geminiService.getFallbackChallenges();
    }
  }

  // Method to manually refresh challenges (e.g., when user requests new ones)
  async refreshChallenges(userId, userProfile, carbonFootprint) {
    const profileHash = this.generateProfileHash(userProfile, carbonFootprint);
    return await this.generateAndCacheChallenges(userId, userProfile, carbonFootprint, profileHash);
  }

  // Analytics: Track API usage
  async getApiUsageStats() {
    const snapshot = await this.db.collection('personalizedChallenges').get();
    let totalApiCalls = 0;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      totalApiCalls += data.apiCallCount || 0;
    });

    return {
      totalUsers: snapshot.size,
      totalApiCalls,
      averageCallsPerUser: snapshot.size > 0 ? totalApiCalls / snapshot.size : 0
    };
  }
}

export default new ChallengeCacheService();
