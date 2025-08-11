// RATE LIMITING DISABLED FOR TESTING
// All rate limiters are now pass-through functions

// General API rate limit - DISABLED
export const generalLimiter = (req, res, next) => {
  next();
};

// Strict rate limit for auth endpoints - DISABLED
export const authLimiter = (req, res, next) => {
  next();
};

// Password reset rate limit - DISABLED
export const passwordResetLimiter = (req, res, next) => {
  next();
};
