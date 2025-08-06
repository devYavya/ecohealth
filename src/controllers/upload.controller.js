import multer from "multer";
import { getStorage } from "firebase-admin/storage";
import { db } from "../config/firebase.js";

const storage = multer.memoryStorage();

// Configure multer with file size limit and file type validation
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check if file is an image
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed!"), false);
    }
  },
});

export const uploadMiddleware = upload.single("profilePicture");

// Middleware to handle multer errors
export const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "File size too large. Maximum allowed size is 10MB",
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        message:
          "Unexpected field name. Use 'profilePicture' as the field name.",
      });
    }
    return res.status(400).json({
      message: "File upload error",
      error: err.message,
    });
  }

  if (err && err.message === "Only image files are allowed!") {
    return res.status(400).json({
      message:
        "Only image files are allowed. Please upload a valid image file (JPEG, PNG, GIF, etc.)",
    });
  }

  if (err) {
    console.error("Upload middleware error:", err);
    return res.status(500).json({
      message: "Internal server error during file upload",
    });
  }

  next();
};

export const uploadProfilePicture = async (req, res) => {
  const uid = req.user.uid;

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  // Validate file size (additional check)
  if (req.file.size > 10 * 1024 * 1024) {
    return res.status(400).json({
      message: "File size too large. Maximum allowed size is 10MB",
    });
  }

  const bucket = getStorage().bucket();
  const fileName = `profile_pictures/${uid}.jpg`;
  const file = bucket.file(fileName);

  try {
    // Check if user already has a profile picture and delete it
    const userDoc = await db.collection("users").doc(uid).get();

    if (userDoc.exists) {
      const userData = userDoc.data();
      const existingProfilePictureUrl = userData.profilePictureUrl;

      if (existingProfilePictureUrl) {
        try {
          // Extract file name from existing URL
          const urlParts = existingProfilePictureUrl.split("/");
          const existingFileName = urlParts[urlParts.length - 1];

          // Check if it's a Firebase Storage URL
          if (existingProfilePictureUrl.includes("storage.googleapis.com")) {
            const existingFile = bucket.file(
              `profile_pictures/${existingFileName}`
            );

            // Check if the old file exists before trying to delete
            const [exists] = await existingFile.exists();
            if (exists) {
              await existingFile.delete();
              console.log(
                `✅ Deleted previous profile picture: ${existingFileName}`
              );
            }
          }
        } catch (deleteError) {
          console.log(
            `⚠️ Could not delete previous profile picture:`,
            deleteError.message
          );
          // Continue with upload even if deletion fails
        }
      }
    }

    // Upload new profile picture
    await file.save(req.file.buffer, {
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    // Make the new file public
    await file.makePublic();
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    // Save new URL to Firestore
    await db.collection("users").doc(uid).update({
      profilePictureUrl: publicUrl,
      lastUpdatedAt: new Date(),
    });

    res.status(200).json({
      message: "Profile picture uploaded successfully",
      profilePictureUrl: publicUrl,
      fileSize: `${(req.file.size / (1024 * 1024)).toFixed(2)} MB`,
      contentType: req.file.mimetype,
    });
  } catch (error) {
    console.error("❌ Upload failed:", error.message);

    // Handle specific multer errors
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        message: "File size too large. Maximum allowed size is 10MB",
      });
    }

    if (error.message === "Only image files are allowed!") {
      return res.status(400).json({
        message:
          "Only image files are allowed. Please upload a valid image file.",
      });
    }

    res.status(500).json({ message: "Failed to upload profile picture" });
  }
};
