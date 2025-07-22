import {
  createUser,
  generateToken,
  getUserByEmail,
  linkSocialAccount,
  checkUserExists,
} from "../services/user.service.js";
import { sendSuccessResponse, sendErrorResponse } from "../utils/response.js";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import admin from "firebase-admin";

dotenv.config();

export const signup = async (req, res, next) => {
  try {
    const { email, password, name, age, gender, bloodGroup } = req.body;

    
    const existingUser = await checkUserExists(email);
    if (existingUser) {
      return sendErrorResponse(
        res,
        409,
        "An account with this email already exists. Please try logging in instead."
      );
    }

    const user = await createUser(
      email,
      password,
      name,
      age,
      gender,
      bloodGroup
    );

    return sendSuccessResponse(
      res,
      201,
      "Account created successfully! Please complete your profile.",
      {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        profileComplete: !!(age && gender && bloodGroup),
      }
    );
  } catch (error) {
    console.error("Signup failed:", error);
    next(error);
  }
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
        profilePictureUrl: user.profilePictureUrl || null,
        profileComplete,
      },
    });
  } catch (error) {
    console.error("Login failed:", error.message);


    if (error.message.includes("Firebase sign-in failed")) {
      return sendErrorResponse(res, 401, "Invalid email or password.");
    }

    next(error);
  }
};

export const socialLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;

    const decoded = await admin.auth().verifyIdToken(idToken);
    const { email, uid } = decoded;

   
    const existingUser = await checkUserExists(email);

    if (existingUser && existingUser.uid !== uid) {
     
      return sendErrorResponse(
        res,
        409,
        "An account with this email already exists. Would you like to link your accounts?",
        {
          accountLinkingRequired: true,
          existingProvider: "email",
          newProvider: decoded.firebase.sign_in_provider,
        }
      );
    }

    let user = await getUserByEmail(email);

   
    if (!user) {
      const userData = {
        uid,
        email,
        name: decoded.name || decoded.email.split("@")[0],
        profileComplete: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await admin.firestore().collection("users").doc(uid).set(userData);
      user = userData;
    }

    const profileComplete = !!(
      user.name &&
      user.age &&
      user.gender &&
      user.bloodGroup
    );

    return sendSuccessResponse(res, 200, "Social login successful!", {
      token: idToken,
      user: {
        uid: user.uid,
        email: user.email,
        name: user.name,
        age: user.age || null,
        gender: user.gender || null,
        bloodGroup: user.bloodGroup || null,
        profilePictureUrl: user.profilePictureUrl || null,
        profileComplete,
      },
    });
  } catch (error) {
    console.error("Social login failed:", error);

    if (error.code === "auth/invalid-id-token") {
      return sendErrorResponse(
        res,
        401,
        "Invalid or expired token. Please try logging in again."
      );
    }

    next(error);
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
