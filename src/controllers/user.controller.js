import { updateUserData } from "../services/user.service.js";
import { sendSuccessResponse, sendErrorResponse } from "../utils/response.js";
import { db, admin } from "../config/firebase.js";

// Helper function to generate referral code
const generateReferralCode = (name, email) => {
  const namePrefix = name ? name.substring(0, 3).toUpperCase() : "ECO";
  const emailPrefix = email.substring(0, 3).toUpperCase();
  const randomNum = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `${namePrefix}${emailPrefix}${randomNum}`;
};

// Helper function to get timezone based on country
const getTimezoneByCountry = (country) => {
  const timezones = {
    india: "Asia/Kolkata",
    uae: "Asia/Dubai",
    dubai: "Asia/Dubai",
    "united arab emirates": "Asia/Dubai",
    usa: "America/New_York",
    "united states": "America/New_York",
    uk: "Europe/London",
    "united kingdom": "Europe/London",
    canada: "America/Toronto",
    australia: "Australia/Sydney",
    singapore: "Asia/Singapore",
    japan: "Asia/Tokyo",
    germany: "Europe/Berlin",
    france: "Europe/Paris",
    brazil: "America/Sao_Paulo",
    china: "Asia/Shanghai",
    russia: "Europe/Moscow",
    "south africa": "Africa/Johannesburg",
    egypt: "Africa/Cairo",
  };

  return timezones[country?.toLowerCase()] || "Asia/Kolkata";
};

export const getUserProfile = async (req, res) => {
  const uid = req.user.uid;

  try {
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return sendErrorResponse(
        res,
        404,
        "User profile not found. Please complete your profile setup."
      );
    }

    let userData = userDoc.data();

    // Check if user has a referral code, if not create one
    if (!userData.referralCode) {
      const referralCode = generateReferralCode(
        userData.name || userData.email.split("@")[0],
        userData.email
      );

      // Update user document with the new referral code
      await db.collection("users").doc(uid).update({
        referralCode: referralCode,
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update userData with the new referral code
      userData.referralCode = referralCode;

      console.log(
        `📝 Generated referral code for user ${userData.email}: ${referralCode}`
      );
    }

    // Remove sensitive data
    const { password, ...safeUserData } = userData;

    // Check if profile is complete
    const profileComplete = !!(
      userData.name &&
      userData.age &&
      userData.gender &&
      userData.bloodGroup
    );

    // Get referral statistics
    const referralStats = {
      myReferralCode: userData.referralCode || null,
      referralCount: userData.referralCount || 0,
      referredBy: userData.referredBy || null,
    };

   
    const countryInfo = {
      country: userData.country || "India", 
      timezone: userData.timezone || "Asia/Kolkata", 
    };

    return sendSuccessResponse(res, 200, "Profile retrieved successfully", {
      ...safeUserData,
      profileComplete,
      referralStats,
      ...countryInfo,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error.message);
    return sendErrorResponse(
      res,
      500,
      "Unable to retrieve profile. Please try again."
    );
  }
};

export const updateUserProfile = async (req, res, next) => {
  try {
    const data = await updateUserData(req.user.uid, req.body);

    // Check if profile is now complete
    const profileComplete = !!(
      data.name &&
      data.age &&
      data.gender &&
      data.bloodGroup
    );

    return sendSuccessResponse(res, 200, "Profile updated successfully", {
      ...data,
      profileComplete,
    });
  } catch (err) {
    console.error("Profile update failed:", err);
    next(err);
  }
};

export const upsertUserProfile = async (req, res) => {
  const uid = req.user.uid;
  const email = req.user.email;
  const { name, age, gender, bloodGroup, country, referredBy } = req.body;

  try {
    const userRef = db.collection("users").doc(uid);
    const doc = await userRef.get();
    const existingData = doc.exists ? doc.data() : {};

    const now = admin.firestore.FieldValue.serverTimestamp();

    // Base profile data
    const data = {
      uid,
      name,
      age: parseInt(age),
      gender,
      bloodGroup,
      email,
      country: country || "India",
      timezone: getTimezoneByCountry(country || "India"),
      lastUpdatedAt: now,
    };

    if (!doc.exists) {
      data.createdAt = now;
    }

    // Handle referral logic - only if user doesn't already have a referredBy value
    let referrerData = null;
    if (referredBy && !existingData.referredBy) {
      // Validate referral code
      const referrerQuery = await admin
        .firestore()
        .collection("users")
        .where("referralCode", "==", referredBy)
        .limit(1)
        .get();

      if (referrerQuery.empty) {
        return sendErrorResponse(res, 400, "Invalid referral code provided.");
      }

      referrerData = referrerQuery.docs[0].data();
      
      // Prevent self-referral
      if (referrerData.uid === uid) {
        return sendErrorResponse(res, 400, "You cannot refer yourself.");
      }

      data.referredBy = referredBy;
      console.log(`👤 User ${email} is being referred by ${referrerData.email}`);
    } else if (referredBy && existingData.referredBy) {
      // User already has a referral, don't allow changing it
      console.log(`⚠️ User ${email} already has referral code: ${existingData.referredBy}. Ignoring new referral code: ${referredBy}`);
      data.referredBy = existingData.referredBy; // Keep existing referral
    }

    // Save user profile
    await userRef.set(data, { merge: true });

    // Process referral bonuses only if this is a new referral
    if (referrerData && !existingData.referredBy) {
      const referrerRef = admin
        .firestore()
        .collection("users")
        .doc(referrerData.uid);
      const referrerGamificationRef = admin
        .firestore()
        .collection("users")
        .doc(referrerData.uid)
        .collection("gamification")
        .doc("data");

      const newUserGamificationRef = admin
        .firestore()
        .collection("users")
        .doc(uid)
        .collection("gamification")
        .doc("data");

      // Update referrer's referral count
      await referrerRef.update({
        referralCount: (referrerData.referralCount || 0) + 1,
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Give referrer bonus points (70 points for successful referral)
      await referrerGamificationRef.set(
        {
          ecoPoints: admin.firestore.FieldValue.increment(70),
          referralBonus: admin.firestore.FieldValue.increment(70),
          lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // Give new user welcome bonus points (70 points for being referred)
      await newUserGamificationRef.set(
        {
          ecoPoints: 70,
          referralWelcomeBonus: 70,
          lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log(
        `🎉 Profile referral success: ${referrerData.email} referred ${email}. Both users got 70 eco points!`
      );
    }

    // Profile is complete after upsert
    const profileComplete = true;

    return sendSuccessResponse(res, 200, "Profile saved successfully", {
      ...data,
      profileComplete,
    });
  } catch (err) {
    console.error("Error saving profile:", err.message);
    return sendErrorResponse(
      res,
      500,
      "Unable to save profile. Please try again."
    );
  }
};

export const checkProfileCompletion = async (req, res) => {
  const uid = req.user.uid;

  try {
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return sendSuccessResponse(res, 200, "Profile completion status", {
        profileComplete: false,
        missingFields: ["name", "age", "gender", "bloodGroup"],
      });
    }

    const userData = userDoc.data();
    const requiredFields = ["name", "age", "gender", "bloodGroup"];
    const missingFields = requiredFields.filter((field) => !userData[field]);
    const profileComplete = missingFields.length === 0;

    return sendSuccessResponse(res, 200, "Profile completion status", {
      profileComplete,
      missingFields,
      completionPercentage: Math.round(
        ((requiredFields.length - missingFields.length) /
          requiredFields.length) *
          100
      ),
    });
  } catch (error) {
    console.error("Error checking profile completion:", error.message);
    return sendErrorResponse(
      res,
      500,
      "Unable to check profile status. Please try again."
    );
  }
};

// Get referral information and statistics
export const getReferralInfo = async (req, res) => {
  const uid = req.user.uid;

  try {
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return sendErrorResponse(res, 404, "User not found");
    }

    let userData = userDoc.data();

    // Check if user has a referral code, if not create one
    if (!userData.referralCode) {
      const referralCode = generateReferralCode(
        userData.name || userData.email.split("@")[0],
        userData.email
      );

      // Update user document with the new referral code
      await db.collection("users").doc(uid).update({
        referralCode: referralCode,
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update userData with the new referral code
      userData.referralCode = referralCode;

      console.log(
        `📝 Generated referral code for user ${userData.email}: ${referralCode}`
      );
    }

    // Get users referred by this user (only if referralCode exists)
    const referredUsersSnapshot = userData.referralCode
      ? await db
          .collection("users")
          .where("referredBy", "==", userData.referralCode)
          .select("name", "email", "createdAt")
          .get()
      : { empty: true, forEach: () => {} }; // Empty snapshot if no referral code

    const referredUsers = [];
    referredUsersSnapshot.forEach((doc) => {
      const data = doc.data();
      referredUsers.push({
        name: data.name,
        email: data.email,
        joinedAt: data.createdAt?.toDate?.() || data.createdAt,
      });
    });

    // Get gamification data to show referral bonus earned
    const gamificationDoc = await db
      .collection("users")
      .doc(uid)
      .collection("gamification")
      .doc("data")
      .get();

    const gamificationData = gamificationDoc.exists
      ? gamificationDoc.data()
      : {};
    const referralBonus = gamificationData.referralBonus || 0;
    const welcomeBonus = gamificationData.referralWelcomeBonus || 0;
    const totalReferralEarnings = referralBonus + welcomeBonus;

    return sendSuccessResponse(res, 200, "Referral information retrieved", {
      myReferralCode: userData.referralCode,
      totalReferrals: userData.referralCount || 0,
      referralBonusEarned: referralBonus, // Points earned from referring others
      welcomeBonusReceived: welcomeBonus, // Points received for being referred
      totalReferralEarnings: totalReferralEarnings, // Combined total
      referredUsers,
      referredBy: userData.referredBy || null,
      shareMessage: `Join EcoHealth and start your sustainable journey! Use my referral code: ${userData.referralCode} and we both get 70 eco points!`,
    });
  } catch (error) {
    console.error("Error fetching referral info:", error.message);
    return sendErrorResponse(
      res,
      500,
      "Unable to retrieve referral information."
    );
  }
};

// Validate referral code
export const validateReferralCode = async (req, res) => {
  const { referralCode } = req.params;

  try {
    const userQuery = await db
      .collection("users")
      .where("referralCode", "==", referralCode.toUpperCase())
      .limit(1)
      .get();

    if (userQuery.empty) {
      return sendErrorResponse(res, 404, "Invalid referral code");
    }

    const referrerData = userQuery.docs[0].data();

    return sendSuccessResponse(res, 200, "Valid referral code", {
      isValid: true,
      referrerName: referrerData.name,
      referrerEmail: referrerData.email,
      bonus: "You and your friend will both get 70 eco points!",
    });
  } catch (error) {
    console.error("Error validating referral code:", error.message);
    return sendErrorResponse(res, 500, "Unable to validate referral code.");
  }
};

// Reset user progress (keep only profile and onboarding data)
export const resetProgress = async (req, res) => {
  const uid = req.user.uid;

  try {
    // Start a batch operation
    const batch = db.batch();

    // Collections to clear (keep profile and onboarding)
    const collectionsToReset = [
      "dailyLogs",
      "gamification",
      "challenges",
      "userDailyTips",
      "socialFeed",
    ];

    // Clear each collection
    for (const collectionName of collectionsToReset) {
      const collectionRef = db
        .collection("users")
        .doc(uid)
        .collection(collectionName);
      const snapshot = await collectionRef.get();

      snapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
    }

    // Reset user stats but keep profile data
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (userDoc.exists) {
      const userData = userDoc.data();

      // Keep only essential profile data
      const dataToKeep = {
        uid: userData.uid,
        email: userData.email,
        name: userData.name,
        age: userData.age,
        gender: userData.gender,
        bloodGroup: userData.bloodGroup,
        role: userData.role,
        country: userData.country,
        timezone: userData.timezone,
        referralCode: userData.referralCode,
        referralCount: userData.referralCount,
        referredBy: userData.referredBy,
        profilePictureUrl: userData?.profilePictureUrl || null,
        createdAt: userData.createdAt,
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        progressResetAt: admin.firestore.FieldValue.serverTimestamp(),
        progressResetCount: (userData.progressResetCount || 0) + 1,
      };

      batch.set(userRef, dataToKeep);
    }

    // Execute all deletions and updates
    await batch.commit();

    return sendSuccessResponse(
      res,
      200,
      "Progress reset successfully! Your profile and onboarding data have been preserved.",
      {
        resetAt: new Date().toISOString(),
        preservedData: [
          "Profile information",
          "Onboarding responses",
          "Referral code and history",
        ],
        clearedData: [
          "Daily logs",
          "Eco points and badges",
          "Challenge progress",
          "AI tips history",
          "Social feed posts",
        ],
      }
    );
  } catch (error) {
    console.error("Error resetting progress:", error.message);
    return sendErrorResponse(
      res,
      500,
      "Unable to reset progress. Please try again."
    );
  }
};
