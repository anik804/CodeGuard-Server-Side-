import { getCollections } from "../config/db.js";
import { cloudinary } from "../config/cloudinary.js";
import { rooms } from "../services/socket.service.js"; // Shared socket room map

// 📋 Provide blacklist to extension
export const getBlacklist = async (req, res) => {
  try {
    const { roomId } = req.query;
    
    if (!roomId) {
      return res.status(400).send({ 
        success: false,
        message: "Room ID is required" 
      });
    }

    const { blockedWebsitesCollection } = getCollections();
    
    // Get room-specific blocked websites
    const roomBlocked = await blockedWebsitesCollection.findOne({ roomId });
    
    // Default blacklist
    const defaultBlacklist = [
      "chatgpt.com",
      "gemini.google.com",
      "bard.google.com",
      "stackoverflow.com",
      "github.com",
    ];
    
    // Merge default with room-specific
    const blacklist = roomBlocked 
      ? [...new Set([...defaultBlacklist, ...(roomBlocked.websites || [])])]
      : defaultBlacklist;
    
    res.status(200).send(blacklist);
  } catch (err) {
    console.error("❌ Error fetching blacklist:", err);
    // Fallback to default
    const defaultBlacklist = [
      "chatgpt.com",
      "gemini.google.com",
      "bard.google.com",
      "stackoverflow.com",
      "github.com",
    ];
    res.status(200).send(defaultBlacklist);
  }
};

// Get blocked websites for a room
export const getBlockedWebsites = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    if (!roomId) {
      return res.status(400).send({ 
        success: false,
        message: "Room ID is required" 
      });
    }

    const { blockedWebsitesCollection } = getCollections();
    
    const roomBlocked = await blockedWebsitesCollection.findOne({ roomId });
    
    res.status(200).send({
      success: true,
      websites: roomBlocked?.websites || []
    });
  } catch (err) {
    console.error("❌ Error fetching blocked websites:", err);
    res.status(500).send({ 
      success: false,
      message: "Internal server error" 
    });
  }
};

// Add blocked website to a room
export const addBlockedWebsite = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { website } = req.body;
    
    if (!roomId || !website) {
      return res.status(400).send({ 
        success: false,
        message: "Room ID and website are required" 
      });
    }

    // Normalize website (remove protocol, www, trailing slash)
    const normalizedWebsite = website
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .toLowerCase();

    const { blockedWebsitesCollection } = getCollections();
    
    // Check if room already has blocked websites
    const existing = await blockedWebsitesCollection.findOne({ roomId });
    
    if (existing) {
      // Add to existing list if not already present
      if (!existing.websites.includes(normalizedWebsite)) {
        await blockedWebsitesCollection.updateOne(
          { roomId },
          { $push: { websites: normalizedWebsite } }
        );
      }
    } else {
      // Create new entry
      await blockedWebsitesCollection.insertOne({
        roomId,
        websites: [normalizedWebsite],
        createdAt: new Date()
      });
    }
    
    res.status(200).send({
      success: true,
      message: "Website blocked successfully"
    });
  } catch (err) {
    console.error("❌ Error adding blocked website:", err);
    res.status(500).send({ 
      success: false,
      message: "Internal server error" 
    });
  }
};

// Remove blocked website from a room
export const removeBlockedWebsite = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { website } = req.body;
    
    if (!roomId || !website) {
      return res.status(400).send({ 
        success: false,
        message: "Room ID and website are required" 
      });
    }

    const { blockedWebsitesCollection } = getCollections();
    
    await blockedWebsitesCollection.updateOne(
      { roomId },
      { $pull: { websites: website } }
    );
    
    res.status(200).send({
      success: true,
      message: "Website unblocked successfully"
    });
  } catch (err) {
    console.error("❌ Error removing blocked website:", err);
    res.status(500).send({ 
      success: false,
      message: "Internal server error" 
    });
  }
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

// 📋 Get activity logs for a specific room with pagination
export const getActivityLogs = async (req, res) => {
  try {
    const { roomId, page = 1, limit = 10 } = req.query;

    if (!roomId) {
      return res.status(400).send({ 
        success: false,
        message: "Room ID is required" 
      });
    }

    const { activityLogsCollection } = getCollections();
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const totalLogs = await activityLogsCollection.countDocuments({ roomId });

    // Fetch logs for this room with pagination, sorted by most recent first
    const logs = await activityLogsCollection
      .find({ roomId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray();

    const totalPages = Math.ceil(totalLogs / limitNum);

    res.status(200).send({
      success: true,
      logs: logs,
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalLogs: totalLogs,
        limit: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (err) {
    console.error("❌ Error fetching activity logs:", err);
    res.status(500).send({ 
      success: false,
      message: "Internal server error" 
    });
  }
};