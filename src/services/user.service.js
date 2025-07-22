import admin from "firebase-admin";
import bcrypt from "bcryptjs";
import axios from "axios";

export const checkUserExists = async (email) => {
  try {
    const user = await admin.auth().getUserByEmail(email);
    return user ? { uid: user.uid, email: user.email } : null;
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      return null;
    }
    throw error;
  }
};

export const linkSocialAccount = async (existingUid, socialIdToken) => {
  try {
    // This would implement account linking logic
    // For now, we'll throw an error to indicate it needs manual handling
    throw new Error("Account linking requires user confirmation");
  } catch (error) {
    throw error;
  }
};

export const createUser = async (
  email,
  password,
  name,
  age,
  gender,
  bloodGroup
) => {
  const firestore = admin.firestore();

  // Create user in Firebase Auth
  const userRecord = await admin.auth().createUser({
    email,
    password,
    displayName: name,
  });

  // Prepare Firestore user data (exclude password in production)
  const userData = {
    uid: userRecord.uid,
    email,
    name,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Only add optional fields if they exist
  if (age) userData.age = Number(age);
  if (gender) userData.gender = gender;
  if (bloodGroup) userData.bloodGroup = bloodGroup;

  // Clean undefined/null fields
  Object.keys(userData).forEach((key) => {
    if (userData[key] === undefined || userData[key] === null) {
      delete userData[key];
    }
  });

  // Save to Firestore
  await firestore.collection("users").doc(userRecord.uid).set(userData);

  return userRecord;
};

export const getUserByEmail = async (email) => {
  const firestore = admin.firestore();
  const user = await admin.auth().getUserByEmail(email);
  const doc = await firestore.collection("users").doc(user.uid).get();
  return doc.exists ? doc.data() : null;
};

export const verifyPassword = async (plain, hash) => {
  return bcrypt.compare(plain, hash);
};

export const generateToken = async (email, password) => {
  const apiKey = process.env.FIREBASE_API_KEY;

  try {
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        email,
        password,
        returnSecureToken: true,
      }
    );
    const { idToken, refreshToken, expiresIn, localId } = response.data;
    return {
      access_Token: idToken,
      refresh_Token: refreshToken,
      expiresIn,
      uid: localId,
    };
  } catch (error) {
    console.error(
      " Failed to generate ID token:",
      error.response?.data || error.message
    );
    throw new Error("Firebase sign-in failed");
  }
};

export const refreshAccessToken = async (refreshToken) => {
  const apiKey = process.env.FIREBASE_API_KEY;

  try {
    const response = await axios.post(
      `https://securetoken.googleapis.com/v1/token?key=${apiKey}`,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { id_token, refresh_token, expires_in, user_id } = response.data;

    return {
      accessToken: id_token,
      refreshToken: refresh_token,
      expiresIn: expires_in,
      uid: user_id,
    };
  } catch (error) {
    console.error(
      "Failed to refresh token:",
      error.response?.data || error.message
    );
    throw new Error("Firebase token refresh failed");
  }
};

export const updateUserData = async (uid, updates) => {
  const firestore = admin.firestore();
  const docRef = firestore.collection("users").doc(uid);
  await docRef.update({
    ...updates,
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  const updated = await docRef.get();
  return updated.data();
};
