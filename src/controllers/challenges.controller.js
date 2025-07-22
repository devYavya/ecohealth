

import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();


export const getChallenges = async (req, res) => {
  try {
    const snapshot = await db.collection("challenges").get();
    const challenges = [];

    snapshot.forEach((doc) => {
      challenges.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    res.status(200).json({
      message: "Challenges retrieved successfully",
      challenges,
    });
  } catch (err) {
    console.error("Error fetching challenges:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const joinChallenge = async (req, res) => {
  const { uid } = req.user;
  const { challengeId } = req.params;

  try {

    const challengeDoc = await db
      .collection("challenges")
      .doc(challengeId)
      .get();
    if (!challengeDoc.exists) {
      return res.status(404).json({ message: "Challenge not found" });
    }

  
    const userChallengeDoc = await db
      .collection("users")
      .doc(uid)
      .collection("challenges")
      .doc(challengeId)
      .get();

    if (userChallengeDoc.exists) {
      return res
        .status(400)
        .json({ message: "Already participating in this challenge" });
    }

   
    const challengeData = challengeDoc.data();
    const userChallengeData = {
      challengeId,
      joinedAt: new Date(),
      progress: 0,
      isCompleted: false,
      completedAt: null,
      pointsEarned: 0,
      badgeEarned: null,
      challengeName: challengeData.name,
      challengeType: challengeData.type,
      pointsAwarded: challengeData.pointsAwarded,
      badgeAwarded: challengeData.badgeAwarded,
      criteria: challengeData.criteria,
      endDate: challengeData.endDate,
    };

    await db
      .collection("users")
      .doc(uid)
      .collection("challenges")
      .doc(challengeId)
      .set(userChallengeData);

    res.status(200).json({
      message: "Successfully joined challenge",
      challenge: userChallengeData,
    });
  } catch (err) {
    console.error("Error joining challenge:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const leaveChallenge = async (req, res) => {
  const { uid } = req.user;
  const { challengeId } = req.params;

  try {
    // Check if user is participating
    const userChallengeDoc = await db
      .collection("users")
      .doc(uid)
      .collection("challenges")
      .doc(challengeId)
      .get();

    if (!userChallengeDoc.exists) {
      return res
        .status(404)
        .json({ message: "Not participating in this challenge" });
    }

    const challengeData = userChallengeDoc.data();
    if (challengeData.isCompleted) {
      return res
        .status(400)
        .json({ message: "Cannot leave a completed challenge" });
    }

    // Remove user from challenge
    await db
      .collection("users")
      .doc(uid)
      .collection("challenges")
      .doc(challengeId)
      .delete();

    res.status(200).json({
      message: "Successfully left challenge",
    });
  } catch (err) {
    console.error("Error leaving challenge:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/challenges/my-challenges - Get user's active and completed challenges
export const getMyChallenges = async (req, res) => {
  const { uid } = req.user;

  try {
    const snapshot = await db
      .collection("users")
      .doc(uid)
      .collection("challenges")
      .orderBy("joinedAt", "desc")
      .get();

    const challenges = [];
    snapshot.forEach((doc) => {
      challenges.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    const activeChallenges = challenges.filter(
      (challenge) => !challenge.isCompleted
    );
    const completedChallenges = challenges.filter(
      (challenge) => challenge.isCompleted
    );

    res.status(200).json({
      message: "User challenges retrieved successfully",
      activeChallenges,
      completedChallenges,
      totalChallenges: challenges.length,
    });
  } catch (err) {
    console.error("Error fetching user challenges:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const updateChallengeProgress = async (uid, dailyLogData) => {
  try {
 
    const challengesSnapshot = await db
      .collection("users")
      .doc(uid)
      .collection("challenges")
      .where("isCompleted", "==", false)
      .get();

    const batch = db.batch();
    const updates = [];

    for (const challengeDoc of challengesSnapshot.docs) {
      const challengeData = challengeDoc.data();
      const { criteria, challengeId, pointsAwarded, badgeAwarded } =
        challengeData;


      let criteriaMetToday = false;

      if (criteria.dietInput && dailyLogData.dietInput === criteria.dietInput) {
        criteriaMetToday = true;
      }

      if (
        criteria.electricityUsage &&
        dailyLogData.electricityUsage <= criteria.electricityUsage
      ) {
        criteriaMetToday = true;
      }

      if (
        criteria.transportInput &&
        dailyLogData.transportInput === criteria.transportInput
      ) {
        criteriaMetToday = true;
      }

      if (criteriaMetToday) {
        const newProgress = challengeData.progress + 1;
        const challengeRef = db
          .collection("users")
          .doc(uid)
          .collection("challenges")
          .doc(challengeId);

       
        const isCompleted = newProgress >= 1;

        const updateData = {
          progress: newProgress,
          updatedAt: new Date(),
        };

        if (isCompleted) {
          updateData.isCompleted = true;
          updateData.completedAt = new Date();
          updateData.pointsEarned = pointsAwarded;
          updateData.badgeEarned = badgeAwarded;

   
          const gamificationRef = db
            .collection("users")
            .doc(uid)
            .collection("gamification")
            .doc("profile");
          updates.push({
            type: "gamification",
            ref: gamificationRef,
            pointsAwarded,
            badgeAwarded,
          });
        }

        batch.update(challengeRef, updateData);
      }
    }


    await batch.commit();


    for (const update of updates) {
      if (update.type === "gamification") {
        const gamificationDoc = await update.ref.get();
        if (gamificationDoc.exists) {
          const gamificationData = gamificationDoc.data();
          const updatedData = {
            ecoPoints: gamificationData.ecoPoints + update.pointsAwarded,
            level:
              Math.floor(
                (gamificationData.ecoPoints + update.pointsAwarded) / 100
              ) + 1,
            updatedAt: new Date(),
          };

        
          if (
            update.badgeAwarded &&
            !gamificationData.badges.includes(update.badgeAwarded)
          ) {
            updatedData.badges = [
              ...gamificationData.badges,
              update.badgeAwarded,
            ];
          }

          await update.ref.update(updatedData);
        }
      }
    }

    return { success: true, updatesCount: updates.length };
  } catch (err) {
    console.error("Error updating challenge progress:", err);
    return { success: false, error: err.message };
  }
};
