// Firebase error code mappings
const firebaseErrorMessages = {
  "auth/email-already-exists":
    "An account with this email already exists. Please try logging in instead.",
  "auth/email-already-in-use":
    "An account with this email already exists. Please try logging in instead.",
  "auth/invalid-email": "Please provide a valid email address.",
  "auth/user-not-found": "No account found with this email address.",
  "auth/wrong-password": "Invalid email or password.",
  "auth/weak-password":
    "Password is too weak. Please choose a stronger password.",
  "auth/too-many-requests": "Too many failed attempts. Please try again later.",
  "auth/user-disabled":
    "This account has been disabled. Please contact support.",
  "auth/invalid-id-token": "Invalid or expired session. Please log in again.",
  "auth/id-token-expired": "Your session has expired. Please log in again.",
  "auth/argument-error": "Invalid request format.",
  "auth/invalid-credential": "Invalid credentials provided.",
};

// Standardized error response
const sendErrorResponse = (res, statusCode, message, details = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString(),
  };

  if (details) {
    response.details = details;
  }

  if (process.env.NODE_ENV === "development") {
    response.environment = "development";
  }

  return res.status(statusCode).json(response);
};

export const errorHandler = (err, req, res, next) => {
  console.error("❌ Error occurred:", {
    message: err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Handle Firebase Auth errors
  if (err.code && err.code.startsWith("auth/")) {
    const message =
      firebaseErrorMessages[err.code] ||
      "Authentication failed. Please try again.";
    return sendErrorResponse(res, 400, message);
  }

  // Handle validation errors (from Joi)
  if (err.isJoi) {
    const errors = err.details.map((detail) => ({
      field: detail.path[0],
      message: detail.message,
    }));
    return sendErrorResponse(res, 400, "Validation failed", { errors });
  }

  // Handle Firestore errors
  if (err.code === "permission-denied") {
    return sendErrorResponse(
      res,
      403,
      "You do not have permission to perform this action."
    );
  }

  if (err.code === "not-found") {
    return sendErrorResponse(res, 404, "The requested resource was not found.");
  }

  // Handle network/timeout errors
  if (err.code === "ETIMEDOUT" || err.code === "ECONNRESET") {
    return sendErrorResponse(
      res,
      503,
      "Service temporarily unavailable. Please try again."
    );
  }

  // Handle duplicate key errors (if using MongoDB)
  if (err.code === 11000) {
    return sendErrorResponse(res, 409, "This resource already exists.");
  }

  // Default error handling
  const statusCode = err.status || err.statusCode || 500;
  const message =
    statusCode === 500
      ? "An unexpected error occurred. Please try again."
      : err.message || "Something went wrong.";

  return sendErrorResponse(
    res,
    statusCode,
    message,
    process.env.NODE_ENV === "development" ? { stack: err.stack } : null
  );
};
