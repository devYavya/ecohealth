import {  updateUserData } from "../services/user.service.js";
import { db,admin } from "../config/firebase.js";

export const getUserProfile = async (req, res) => {
  const uid = req.user.uid;

  try {
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User profile not found" });
    }

    const userData = userDoc.data();

 
    const { password, ...safeUserData } = userData;

    return res.status(200).json(safeUserData);
  } catch (error) {
    console.error(" Error fetching user profile:", error.message);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateUserProfile = async (req, res, next) => {
  try {
    const data = await updateUserData(req.user.uid, req.body);
    res.json({ message: "Profile updated", data });
  } catch (err) {
    next(err);
  }
};

export const upsertUserProfile = async (req, res) => {
  const uid = req.user.uid;
  const email = req.user.email;

  const { name, age, gender, bloodGroup } = req.body;

  if (!name || !age || !gender || !bloodGroup) {
    return res.status(400).json({ message: "Missing required fields" });
  }

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

    return res.status(200).json({ message: "Profile updated", data });
  } catch (err) {
    console.error(" Error saving profile:", err.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};