import admin from "firebase-admin";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!admin.apps.length) {
  try {
    const serviceAccountPath = path.resolve(
      __dirname,
      "firebase-service-account.json"
    );
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath));

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
      storageBucket: process.env.BUCKET_NAME, 
    });

    console.log(" Firebase Admin initialized successfully");
  } catch (error) {
    console.error(" Firebase initialization failed:", error.message);
    console.log("📝 Please ensure your Firebase service account is correct.");
  }
}


const db = admin.firestore();
const bucket = admin.storage().bucket();



export { admin, db, bucket };
