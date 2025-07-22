import { updateUserData } from "../services/user.service.js";
import { sendSuccessResponse, sendErrorResponse } from "../utils/response.js";
import { db, admin } from "../config/firebase.js";

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

    const userData = userDoc.data();

    // Remove sensitive data
    const { password, ...safeUserData } = userData;

    // Check if profile is complete
    const profileComplete = !!(
      userData.name &&
      userData.age &&
      userData.gender &&
      userData.bloodGroup
    );

    return sendSuccessResponse(res, 200, "Profile retrieved successfully", {
      ...safeUserData,
      profileComplete,
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
  const { name, age, gender, bloodGroup } = req.body;

  try {
    const userRef = db.collection("users").doc(uid);
    const doc = await userRef.get();

    const now = admin.firestore.FieldValue.serverTimestamp();

    const data = {
      uid,
      name,
      age: parseInt(age),
      gender,
      bloodGroup,
      email,
      lastUpdatedAt: now,
    };

    if (!doc.exists) {
      data.createdAt = now;
    }

    await userRef.set(data, { merge: true });

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
