import { admin } from "../config/firebase.js";
import { sendErrorResponse } from "../utils/response.js";

// Middleware to verify user has admin role
export const verifyAdmin = async (req, res, next) => {
  try {
    // First verify the token (this should come after verifyToken middleware)
    if (!req.user || !req.user.uid) {
      return sendErrorResponse(res, 401, "Unauthorized: No user found");
    }

    const uid = req.user.uid;

    // Get user data from Firestore to check role
    const userDoc = await admin.firestore().collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return sendErrorResponse(res, 404, "User not found");
    }

    const userData = userDoc.data();

    // Check if user has admin role
    if (userData.role !== "admin") {
      return sendErrorResponse(
        res,
        403,
        "Forbidden: Admin access required. You don't have permission to perform this action."
      );
    }

    // Add admin data to request object for use in controllers
    req.admin = {
      uid: userData.uid,
      email: userData.email,
      name: userData.name,
      role: userData.role,
    };

    next();
  } catch (error) {
    console.error("Admin verification failed:", error);
    return sendErrorResponse(res, 500, "Failed to verify admin access");
  }
};

// Optional: Middleware to check if user is admin or owner of resource
export const verifyAdminOrOwner = (resourceUidField = "uid") => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.uid) {
        return sendErrorResponse(res, 401, "Unauthorized: No user found");
      }

      const currentUserId = req.user.uid;
      const resourceUserId =
        req.params[resourceUidField] || req.body[resourceUidField];

      // Get user data to check role
      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(currentUserId)
        .get();

      if (!userDoc.exists) {
        return sendErrorResponse(res, 404, "User not found");
      }

      const userData = userDoc.data();

      // Allow if user is admin OR if user is the owner of the resource
      if (userData.role === "admin" || currentUserId === resourceUserId) {
        req.isAdmin = userData.role === "admin";
        req.isOwner = currentUserId === resourceUserId;
        next();
      } else {
        return sendErrorResponse(
          res,
          403,
          "Forbidden: You can only access your own resources or need admin privileges"
        );
      }
    } catch (error) {
      console.error("Authorization check failed:", error);
      return sendErrorResponse(res, 500, "Failed to verify permissions");
    }
  };
};
