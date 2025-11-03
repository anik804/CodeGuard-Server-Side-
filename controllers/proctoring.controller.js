import { getCollections } from "../config/db.js";
import { cloudinary } from "../config/cloudinary.js";
import { rooms } from "../services/socket.service.js"; // Shared socket room map

// 📋 Provide blacklist to extension
export const getBlacklist = (req, res) => {
  const blacklist = [
    "chatgpt.com",
    "gemini.google.com",
    "bard.google.com",
    "stackoverflow.com",
    "github.com",
    // Add any others here
  ];
  res.status(200).send(blacklist);
};

// 🚨 Handle flagged student activity from extension
export const flagStudentActivity = (io) => async (req, res) => {
  try {
    const { studentId, roomId, illegalUrl, screenshotData, timestamp } = req.body;

    if (!studentId || !roomId || !illegalUrl || !screenshotData) {
      return res.status(400).send({ message: "Missing required fields" });
    }

    // 🖼️ Rebuild Data URI for Cloudinary upload
    const dataUri = `data:image/jpeg;base64,${screenshotData}`;

    // Upload screenshot to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: "code_guard_flags",
      public_id: `${studentId}_${Date.now()}`,
    });

    // 🗃️ Save to MongoDB (activityLogs collection)
    const { activityLogsCollection } = getCollections();

    const logEntry = {
      studentId,
      roomId,
      illegalUrl,
      screenshotUrl: uploadResult.secure_url,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    };

    await activityLogsCollection.insertOne(logEntry);

    // 📡 Notify the examiner in real-time
    if (rooms[roomId]?.examiner) {
      const examinerSocketId = rooms[roomId].examiner;
      io.to(examinerSocketId).emit("student-flagged", logEntry);
      console.log(`🚨 Student ${studentId} flagged for visiting: ${illegalUrl}`);
    } else {
      console.warn(`⚠️ Examiner not found for room: ${roomId}`);
    }

    res.status(200).send({ message: "Flag log received successfully" });

  } catch (err) {
    console.error("❌ Error flagging activity:", err);
    if (err.http_code) {
      return res.status(err.http_code).send({ message: err.message });
    }
    res.status(500).send({ message: "Internal server error" });
  }
};

