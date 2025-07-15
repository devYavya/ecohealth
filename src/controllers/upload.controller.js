import multer from "multer";
import { getStorage } from "firebase-admin/storage";
import { db } from "../config/firebase.js";
const storage = multer.memoryStorage();
const upload = multer({ storage });


export const uploadMiddleware = upload.single("profilePicture"); 


export const uploadProfilePicture = async (req, res) => {
  const uid = req.user.uid;

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const bucket = getStorage().bucket();
  const fileName = `profile_pictures/${uid}.jpg`;
  const file = bucket.file(fileName);

  try {
 
    await file.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
      },
    });

   
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    // Save URL to Firestore
    await db.collection("users").doc(uid).update({
      profilePictureUrl: publicUrl,
      lastUpdatedAt: new Date(),
    });

    res.status(200).json({
      message: "Profile picture uploaded successfully",
      profilePictureUrl: publicUrl,
    });
  } catch (error) {
    console.error("❌ Upload failed:", error.message);
    res.status(500).json({ message: "Failed to upload profile picture" });
  }
};
