import {
  createUser,
  generateToken,
  getUserByEmail,
} from "../services/user.service.js";
import admin from "firebase-admin";
export const signup = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const user = await createUser(email, password, name);
    res.status(201).json({ message: "Signup successful", uid: user.uid });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const token = await generateToken(email, password);
    const user = await getUserByEmail(email);

    res.json({ token, user });
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

export const sendPasswordResetEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    const link = await admin.auth().generatePasswordResetLink(email);

    console.log("🔗 Reset link:", link); 

    
    res.json({ message: "Reset link generated. Check logs for now.", link });
  } catch (error) {
    console.error("❌ Password reset failed:", error.message);
    next(error);
  }
};


export const logout = async (req, res) => {
  res.json({ message: "Logout handled on client" });
};
