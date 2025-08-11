import {
  createUser,
  generateToken,
  getUserByEmail,
  linkSocialAccount,
  checkUserExists,
  generateTokenFromUID
} from "../services/user.service.js";
import { sendSuccessResponse, sendErrorResponse } from "../utils/response.js";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import admin from "firebase-admin";

dotenv.config();

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
    "saudi arabia": "Asia/Riyadh",
    kuwait: "Asia/Kuwait",
    qatar: "Asia/Qatar",
    bahrain: "Asia/Bahrain",
    oman: "Asia/Muscat",
  };

  const countryLower = country ? country.toLowerCase() : "india";
  return timezones[countryLower] || "Asia/Kolkata"; // Default to India timezone
};

export const signup = async (req, res, next) => {
  try {
    const {
      email,
      password,
      name,
      age,
      gender,
      bloodGroup,
      role,
      country,
      referredBy,
    } = req.body;

    const existingUser = await checkUserExists(email);
    if (existingUser) {
      return sendErrorResponse(
        res,
        409,
        "An account with this email already exists. Please try logging in instead."
      );
    }

    // Validate referral code if provided
    let referrerData = null;
    if (referredBy) {
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
    }

    // Default role to "user" if not provided, only allow "admin" for specific emails
    const userRole = role === "admin" && isAdminEmail(email) ? "admin" : "user";
    console.log(
      `🔑 Role assignment: requested="${role}", email="${email}", isAdminEmail="${isAdminEmail(
        email
      )}", finalRole="${userRole}"`
    );

    // Generate unique referral code
    const referralCode = generateReferralCode(name, email);

    // Get timezone based on country
    const timezone = getTimezoneByCountry(country);

    const user = await createUser(
      email,
      password,
      name,
      age,
      gender,
      bloodGroup,
      userRole,
      country || "India",
      timezone,
      referralCode,
      referredBy
    );

    // If user was referred, update referrer's referral count and give bonus points to both users
    if (referrerData) {
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
        .doc(user.uid)
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
        `🎉 Referral success: ${referrerData.email} referred ${email}. Both users got 70 eco points!`
      );
    }

    return sendSuccessResponse(
      res,
      201,
      "Account created successfully! Please complete your profile.",
      {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        role: userRole,
        country: country || "India",
        timezone,
        referralCode,
        profileComplete: !!(age && gender && bloodGroup),
      }
    );
  } catch (error) {
    console.error("Signup failed:", error);
    next(error);
  }
};

// Helper function to check if email is allowed to be admin
const isAdminEmail = (email) => {
  const adminEmails = [
    process.env.ADMIN_EMAIL,
    "admin@ecohealth.com",
    "devyavya@gmail.com",
    "user1@example.com", // Added for testing
    "test@admin.com", // Add more test admin emails here
  ];
  console.log(
    `🔍 Checking if ${email} is admin email:`,
    adminEmails.includes(email)
  );
  return adminEmails.includes(email);
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const userExists = await checkUserExists(email);
    if (!userExists) {
      return sendErrorResponse(
        res,
        404,
        "No account found with this email address. Please sign up first."
      );
    }

    const { access_Token, refresh_Token } = await generateToken(
      email,
      password
    );
    const user = await getUserByEmail(email);

    const profileComplete = !!(
      user.name &&
      user.age &&
      user.gender &&
      user.bloodGroup
    );

    return sendSuccessResponse(res, 200, "Login successful!", {
      accessToken: access_Token,
      refreshToken: refresh_Token,
      user: {
        uid: user.uid,
        email: user.email,
        name: user.name,
        age: user.age,
        gender: user.gender,
        bloodGroup: user.bloodGroup,
        role: user.role || "user", // Include role in response
        profilePictureUrl: user.profilePictureUrl || null,
        profileComplete,
      },
    });
  } catch (error) {
    console.error("Login failed:", error.message);

    // Handle specific error types - RATE LIMITING DISABLED FOR TESTING
    if (
      error.message.includes("RATE_LIMITED") ||
      error.message.includes("TOO_MANY_ATTEMPTS")
    ) {
      return sendErrorResponse(
        res,
        401,
        "Please check your credentials. If you continue having issues, try resetting your password."
      );
    } else if (error.message.includes("INVALID_CREDENTIALS")) {
      return sendErrorResponse(res, 401, "Invalid email or password.");
    } else if (error.message.includes("ACCOUNT_DISABLED")) {
      return sendErrorResponse(
        res,
        403,
        "This account has been disabled. Please contact support."
      );
    } else if (error.message.includes("Firebase sign-in failed")) {
      return sendErrorResponse(
        res,
        401,
        "Login failed. Please check your credentials and try again."
      );
    }

    next(error);
  }
};

export const socialLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return sendErrorResponse(res, 400, "Firebase ID token is required.");
    }

    // ✅ 1. Verify Firebase ID token
    const decoded = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decoded;

    // ✅ 2. Get or Create Firebase Auth user
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().getUser(uid);
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        firebaseUser = await admin.auth().createUser({
          uid,
          email,
          displayName: name || email.split("@")[0],
          photoURL: picture || null,
          emailVerified: true,
        });
      } else {
        throw error;
      }
    }

    // ✅ 3. Firestore User Check/Create
    const userRef = admin.firestore().collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      // Generate referral code for social login users
      const referralCode = generateReferralCode(
        name || email.split("@")[0],
        email
      );

      const userData = {
        uid,
        email,
        name: name || email.split("@")[0],
        role: "user",
        country: "India", // Default country
        timezone: "Asia/Kolkata", // Default timezone
        referralCode,
        referralCount: 0,
        profileComplete: false,
        profilePictureUrl: picture || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await userRef.set(userData);
    }

    // ✅ 4. Generate Firebase custom token (if using signInWithCustomToken on frontend)
   const { access_Token, refresh_Token } = await generateTokenFromUID(uid);

return sendSuccessResponse(res, 200, "Social login successful!", {
  accessToken: access_Token,
  refreshToken: refresh_Token,
  user: {
    uid,
    email,
    name: name || email.split("@")[0],
    picture: picture || null,
    profileComplete: !!(
      userDoc.data()?.name &&
      userDoc.data()?.age &&
      userDoc.data()?.gender &&
      userDoc.data()?.bloodGroup
    ),
  },
});
  } catch (error) {
    console.error("❌ Social login failed:", error.message);

    if (error.code === "auth/invalid-id-token") {
      return sendErrorResponse(res, 401, "Invalid or expired Firebase token.");
    }

    return next(error);
  }
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

export const sendPasswordResetEmail = async (req, res, next) => {
  try {
    const { email } = req.body;

    const userExists = await checkUserExists(email);
    if (!userExists) {
      return sendSuccessResponse(
        res,
        200,
        "If an account with this email exists, a password reset link has been sent."
      );
    }

    const link = await admin.auth().generatePasswordResetLink(email);

    const mailOptions = {
      from: `"Ecohealth Team" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: "🔐 Password Reset Request - Ecohealth",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #28a745;">Reset Your Password - Ecohealth</h2>
          <p>Hello,</p>
          <p>We received a request to reset the password for your Ecohealth account. Please click the button below to reset your password:</p>
          
          <div style="text-align: center; margin: 20px 0;">
            <a href="${link}" style="padding: 12px 20px; background-color: #28a745; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
          </div>

          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${link}</p>

          <hr style="margin: 30px 0;" />

          <p><strong>Security Notice:</strong></p>
          <ul>
            <li>This link will expire in 1 hour for security purposes</li>
            <li>If you didn't request this password reset, please ignore this email</li>
            <li>Your password will remain unchanged unless you click the link above</li>
          </ul>

          <p>If you need help, contact the Ecohealth support team at <a href="mailto:${process.env.ADMIN_SUPPORT_EMAIL}">${process.env.ADMIN_SUPPORT_EMAIL}</a>.</p>

          <p>Best regards,<br/>The Ecohealth Team</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return sendSuccessResponse(
      res,
      200,
      "Password reset instructions have been sent to your email. Please check your inbox and spam folder."
    );
  } catch (error) {
    console.error("❌ Password reset failed:", error.message);

    if (error.code === "auth/user-not-found") {
      return sendSuccessResponse(
        res,
        200,
        "If an account with this email exists, a password reset link has been sent."
      );
    }

    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return sendErrorResponse(res, 400, "Refresh token is required.");
    }

    const { refreshAccessToken } = await import("../services/user.service.js");
    const tokens = await refreshAccessToken(refreshToken);

    return sendSuccessResponse(
      res,
      200,
      "Token refreshed successfully!",
      tokens
    );
  } catch (error) {
    console.error("Token refresh failed:", error);

    if (error.message.includes("refresh failed")) {
      return sendErrorResponse(
        res,
        401,
        "Invalid or expired refresh token. Please log in again."
      );
    }

    next(error);
  }
};

export const logout = async (req, res) => {
  return sendSuccessResponse(
    res,
    200,
    "Logout successful! Please clear your local session data."
  );
};
