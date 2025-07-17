import {
  createUser,
  generateToken,
  getUserByEmail,
} from "../services/user.service.js";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import admin from "firebase-admin";

dotenv.config();

export const signup = async (req, res, next) => {
  try {
    const { email, password, name, age, gender, bloodGroup } = req.body;
    const user = await createUser(email, password, name, age, gender, bloodGroup);
    res.status(201).json({ message: "Signup successful", uid: user.uid });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { access_Token, refresh_Token } = await generateToken(email, password);
    const user = await getUserByEmail(email);

    res.json({ access_Token, refresh_Token, user });
  } catch (error) {
    console.error("Login failed:", error.message);
    res.status(401).json({ message: "Invalid email or password" });
  }
};

export const socialLogin = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    const decoded = await admin.auth().verifyIdToken(idToken);
    const user = await getUserByEmail(decoded.email);
    res.json({ token: idToken, uid: decoded.uid, user });
  } catch (error) {
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
    const link = await admin.auth().generatePasswordResetLink(email);
const mailOptions = {
  from: `"Ecohealth Team" <${process.env.GMAIL_USER}>`,
  to: email,
  subject: "🔐 Password Reset Request",
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

      <p>If you didn't request a password reset, you can ignore this email — your password will remain unchanged.</p>
      <p>If you need help, contact the Ecohealth support team at <a href="mailto:${process.env.ADMIN_SUPPORT_EMAIL}">${process.env.ADMIN_SUPPORT_EMAIL}</a>.</p>

      <p>Best regards,<br/>The Ecohealth Team</p>
    </div>
  `,
};


    await transporter.sendMail(mailOptions);
    res.json({ message: "Reset link sent to your email." });
  } catch (error) {
    console.error("❌ Password reset failed:", error.message);
    next(error);
  }
};


export const logout = async (req, res) => {
  res.json({ message: "Logout handled on client" });
};
