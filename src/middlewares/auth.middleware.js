import { admin } from "../config/firebase.js";
import { sendErrorResponse } from "../utils/response.js";

export const verifyToken = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header) {
    return sendErrorResponse(
      res,
      401,
      "Authorization header is required. Please provide a valid token."
    );
  }

  if (!header.startsWith("Bearer ")) {
    return sendErrorResponse(
      res,
      401,
      "Invalid authorization format. Use 'Bearer <token>'."
    );
  }

  const token = header.split(" ")[1];

  if (!token) {
    return sendErrorResponse(
      res,
      401,
      "Token is missing. Please provide a valid token."
    );
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);

    // Add user info to request object
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: decoded.email_verified,
      authTime: decoded.auth_time,
      iat: decoded.iat,
      exp: decoded.exp,
    };

    next();
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);

    // Handle specific token errors
    if (err.code === "auth/id-token-expired") {
      return sendErrorResponse(
        res,
        401,
        "Your session has expired. Please log in again."
      );
    }

    if (err.code === "auth/invalid-id-token") {
      return sendErrorResponse(res, 401, "Invalid token. Please log in again.");
    }

    if (err.code === "auth/argument-error") {
      return sendErrorResponse(
        res,
        401,
        "Malformed token. Please log in again."
      );
    }

    return sendErrorResponse(
      res,
      403,
      "Token verification failed. Please log in again."
    );
  }
};

// Middleware to check if profile is complete
export const requireCompleteProfile = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const userDoc = await admin.firestore().collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return sendErrorResponse(
        res,
        404,
        "User profile not found. Please complete your profile setup."
      );
    }

    const userData = userDoc.data();
    const profileComplete = !!(
      userData.name &&
      userData.age &&
      userData.gender
    );

    if (!profileComplete) {
      return sendErrorResponse(
        res,
        400,
        "Profile incomplete. Please complete your profile before accessing this feature.",
        {
          profileComplete: false,
          requiredFields: ["name", "age", "gender"],
        }
      );
    }

    next();
  } catch (error) {
    console.error("Error checking profile completion:", error);
    return sendErrorResponse(res, 500, "Unable to verify profile status.");
  }
};
