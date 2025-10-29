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
  role = "user",
  country = "India",
  timezone = "Asia/Kolkata",
  referralCode,
  referredBy = null
) => {
  const firestore = admin.firestore();

  // Create user in Firebase Auth
  const userRecord = await admin.auth().createUser({
    email,
    password,
    displayName: name,
  });

  const userData = {
    uid: userRecord.uid,
    email,
    name,
    role, // Default to "user", can be "admin"
    country,
    timezone,
    referralCode,
    referralCount: 0,
    emailVerified: false,
    emailVerifiedAt: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  // Add referredBy if provided
  if (referredBy) {
    userData.referredBy = referredBy;
  }

  // Only add optional fields if they exist
  if (age) userData.age = Number(age);
  if (gender) userData.gender = gender;

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

    // Handle specific Firebase errors - RATE LIMITING DISABLED FOR TESTING
    const errorCode = error.response?.data?.error?.message;
    if (errorCode === "TOO_MANY_ATTEMPTS_TRY_LATER") {
      // For testing, we'll treat this as invalid credentials instead of rate limiting
      throw new Error(
        "INVALID_CREDENTIALS: Please check your email and password. If you continue having issues, try resetting your password."
      );
    } else if (
      errorCode === "INVALID_PASSWORD" ||
      errorCode === "EMAIL_NOT_FOUND"
    ) {
      throw new Error("INVALID_CREDENTIALS: Invalid email or password.");
    } else if (errorCode === "USER_DISABLED") {
      throw new Error("ACCOUNT_DISABLED: This account has been disabled.");
    }

    throw new Error("Firebase sign-in failed");
  }
};

export const generateTokenFromUID = async (uid) => {
  try {
    await admin.auth().updateUser(uid, { photoURL: null });
    const customToken = await admin.auth().createCustomToken(uid);

    const apiKey = process.env.FIREBASE_API_KEY;
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      {
        token: customToken,
        returnSecureToken: true,
      }
    );

    const { idToken, refreshToken, expiresIn } = response.data;

    return {
      access_Token: idToken,
      refresh_Token: refreshToken,
      expiresIn,
      uid,
    };
  } catch (error) {
    console.error(
      "❌ Failed to generate token from UID:",
      error.response?.data || error.message
    );
    throw new Error("SOCIAL_LOGIN_TOKEN_FAILED");
  }
};

export const generateTokenFromIdToken = async (googleIdToken) => {
  try {
    // 1. Decode Google ID Token (no verify yet)
    const decoded = jwtDecode(googleIdToken);
    const { email, name } = decoded;

    if (!email) {
      throw new Error("INVALID_ID_TOKEN: Email not found in token");
    }

    // 2. Check if user exists in DB
    let user = await User.findOne({ email });
    if (!user) {
      // Register user with Google provider
      user = await User.create({
        name: name || email.split("@")[0],
        email,
        provider: "google",
      });
    }

    // 3. Update Firebase user photoURL = null
    await admin.auth().updateUser(user.uid, { photoURL: null });

    // 4. Create custom token from UID
    const customToken = await admin.auth().createCustomToken(user.uid);

    // 5. Exchange custom token for Firebase ID token
    const apiKey = process.env.FIREBASE_API_KEY;
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      {
        token: customToken,
        returnSecureToken: true,
      }
    );

    const { idToken, refreshToken, expiresIn } = response.data;

    return {
      access_Token: idToken,
      refresh_Token: refreshToken,
      expiresIn,
      uid: user.uid,
    };
  } catch (error) {
    console.error(
      "❌ Failed to generate token from Google ID token:",
      error.response?.data || error.message
    );
    throw new Error("SOCIAL_LOGIN_TOKEN_FAILED");
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

/**
 * Update email verification status in Firestore
 * @param {string} uid - User ID
 * @param {boolean} emailVerified - Verification status
 */
export const updateEmailVerificationStatus = async (uid, emailVerified) => {
  try {
    const firestore = admin.firestore();
    await firestore
      .collection("users")
      .doc(uid)
      .update({
        emailVerified,
        emailVerifiedAt: emailVerified
          ? admin.firestore.FieldValue.serverTimestamp()
          : null,
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    console.log(
      `📧 Email verification status updated for ${uid}: ${emailVerified}`
    );
    return true;
  } catch (error) {
    console.error("Error updating email verification status:", error);
    throw error;
  }
};

/**
 * Check if email is verified
 * @param {string} uid - User ID
 */
export const checkEmailVerified = async (uid) => {
  try {
    const userRecord = await admin.auth().getUser(uid);
    return userRecord.emailVerified;
  } catch (error) {
    console.error("Error checking email verification:", error);
    throw error;
  }
};
