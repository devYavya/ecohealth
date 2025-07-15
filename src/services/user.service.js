import admin from "firebase-admin";
import bcrypt from "bcryptjs";
import axios from "axios";

export const createUser = async (email, password, name) => {
  const firestore = admin.firestore();


  const hashedPassword = await bcrypt.hash(password, 10);


  const userRecord = await admin
    .auth()
    .createUser({ email, password, displayName: name });

 
  const userData = {
    uid: userRecord.uid,
    email,
    name,
    password: hashedPassword, 
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };


  Object.keys(userData).forEach((key) => {
    if (userData[key] === undefined) {
      delete userData[key];
    }
  });

  const docRef = firestore.collection("users").doc(userRecord.uid);
  await docRef.set(userData);

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

    return response.data.idToken;
  } catch (error) {
    console.error(
      " Failed to generate ID token:",
      error.response?.data || error.message
    );
    throw new Error("Firebase sign-in failed");
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
