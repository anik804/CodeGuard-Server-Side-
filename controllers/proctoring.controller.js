import { getCollections } from "../config/db.js";
import { cloudinary } from "../config/cloudinary.js";
import { rooms } from "../services/socket.service.js"; // Shared socket room map
import { ObjectId } from "mongodb";

// 📋 Provide monitoring list to extension (monitored websites - all others are allowed, no blocking)
// Extension will allow all navigation but flag visits to sites NOT in the allowed list
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
    
    // Get room-specific allowed websites (using the same collection but storing allowed sites)
    const roomAllowed = await blockedWebsitesCollection.findOne({ roomId });
    
    // Default allowed websites (these won't trigger flags)
    const defaultAllowed = [
      "google.com",
      "gmail.com",
      "google.co.uk",
      "google.ca",
      "google.com.au",
      "youtube.com", // For educational videos if needed
      "mail.google.com",
      "drive.google.com",
      "docs.google.com",
      "classroom.google.com",
      "accounts.google.com",
      "google.co.in",
      // ImageKit domains for viewing/downloading exam questions
      "ik.imagekit.io",
      "imagekit.io",
      "*.imagekit.io",
    ];
    
    // Merge default with room-specific allowed websites
    const allowedWebsites = roomAllowed 
      ? [...new Set([...defaultAllowed, ...(roomAllowed.allowedWebsites || roomAllowed.websites || [])])]
      : defaultAllowed;
    
    // Return monitoring mode - extension will allow all navigation but flag visits to non-allowed sites
    res.status(200).send({
      allowedWebsites: allowedWebsites, // Sites that won't trigger flags
      monitoredWebsites: [], // Empty means monitor everything NOT in allowedWebsites
      mode: "monitoring", // Indicate monitoring mode (no blocking)
      allowAllNavigation: true, // Allow all sites, just flag monitored ones
      whitelist: allowedWebsites // For backward compatibility with extension
    });
  } catch (err) {
    console.error("❌ Error fetching monitoring list:", err);
    // Fallback to default allowed list
    const defaultAllowed = [
      "google.com",
      "gmail.com",
      "google.co.uk",
      "google.ca",
      "google.com.au",
      "youtube.com",
      "mail.google.com",
      "drive.google.com",
      "docs.google.com",
      "classroom.google.com",
      "accounts.google.com",
      "google.co.in",
      // ImageKit domains for viewing/downloading exam questions
      "ik.imagekit.io",
      "imagekit.io",
      "*.imagekit.io",
    ];
    res.status(200).send({
      allowedWebsites: defaultAllowed,
      monitoredWebsites: [],
      mode: "monitoring",
      allowAllNavigation: true,
      whitelist: defaultAllowed // For backward compatibility
    });
  }
};

// Get allowed websites for a room (Website Access Control)
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
    
    const roomAllowed = await blockedWebsitesCollection.findOne({ roomId });
    
    // Default allowed websites
    const defaultAllowed = [
      "google.com",
      "gmail.com",
      "google.co.uk",
      "google.ca",
      "google.com.au",
    ];
    
    // Get custom allowed websites (stored in allowedWebsites or websites field for backward compatibility)
    const customAllowed = roomAllowed?.allowedWebsites || roomAllowed?.websites || [];
    
    // Merge default with custom
    const allAllowed = [...new Set([...defaultAllowed, ...customAllowed])];
    
    res.status(200).send({
      success: true,
      allowedWebsites: allAllowed,
      defaultAllowed: defaultAllowed,
      customAllowed: customAllowed
    });
  } catch (err) {
    console.error("❌ Error fetching allowed websites:", err);
    res.status(500).send({ 
      success: false,
      message: "Internal server error" 
    });
  }
};

// Add allowed website to a room (Website Access Control)
export const addBlockedWebsite = (io) => {
  return async (req, res) => {
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
      
      // Default allowed websites (cannot be removed)
      const defaultAllowed = [
        "google.com",
        "gmail.com",
        "google.co.uk",
        "google.ca",
        "google.com.au",
      ];
      
      // Check if trying to add a default website
      if (defaultAllowed.includes(normalizedWebsite)) {
        return res.status(400).send({ 
          success: false,
          message: "This website is already allowed by default" 
        });
      }
      
      // Check if room already has allowed websites
      const existing = await blockedWebsitesCollection.findOne({ roomId });
      
      if (existing) {
        // Use allowedWebsites field, fallback to websites for backward compatibility
        const currentAllowed = existing.allowedWebsites || existing.websites || [];
        if (!currentAllowed.includes(normalizedWebsite)) {
          await blockedWebsitesCollection.updateOne(
            { roomId },
            { 
              $push: { allowedWebsites: normalizedWebsite },
              $set: { updatedAt: new Date() }
            }
          );
        }
      } else {
        // Create new entry with allowedWebsites field
        await blockedWebsitesCollection.insertOne({
          roomId,
          allowedWebsites: [normalizedWebsite],
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      // ✅ Notify all students in the room to refresh their whitelist
      console.log(`📢 Broadcasting whitelist update to room ${roomId}`);
      io.to(roomId).emit("whitelist-updated", {
        roomId,
        action: "added",
        website: normalizedWebsite,
        timestamp: new Date().toISOString()
      });
      
      res.status(200).send({
        success: true,
        message: "Website added to allowed list successfully"
      });
    } catch (err) {
      console.error("❌ Error adding allowed website:", err);
      res.status(500).send({ 
        success: false,
        message: "Internal server error" 
      });
    }
  };
};

// Remove allowed website from a room (Website Access Control)
export const removeBlockedWebsite = (io) => {
  return async (req, res) => {
    try {
      const { roomId } = req.params;
      const { website } = req.body;
      
      if (!roomId || !website) {
        return res.status(400).send({ 
          success: false,
          message: "Room ID and website are required" 
        });
      }

      // Default allowed websites (cannot be removed)
      const defaultAllowed = [
        "google.com",
        "gmail.com",
        "google.co.uk",
        "google.ca",
        "google.com.au",
      ];
      
      // Check if trying to remove a default website
      if (defaultAllowed.includes(website)) {
        return res.status(400).send({ 
          success: false,
          message: "Cannot remove default allowed websites" 
        });
      }

      const { blockedWebsitesCollection } = getCollections();
      
      // Remove from both allowedWebsites and websites (for backward compatibility)
      await blockedWebsitesCollection.updateOne(
        { roomId },
        { 
          $pull: { 
            allowedWebsites: website,
            websites: website 
          },
          $set: { updatedAt: new Date() }
        }
      );
      
      // ✅ Notify all students in the room to refresh their whitelist
      console.log(`📢 Broadcasting whitelist update to room ${roomId}`);
      io.to(roomId).emit("whitelist-updated", {
        roomId,
        action: "removed",
        website: website,
        timestamp: new Date().toISOString()
      });
      
      res.status(200).send({
        success: true,
        message: "Website removed from allowed list successfully"
      });
    } catch (err) {
      console.error("❌ Error removing allowed website:", err);
      res.status(500).send({ 
        success: false,
        message: "Internal server error" 
      });
    }
  };
};

// 🚨 Handle flagged student activity from extension
export const flagStudentActivity = (io) => async (req, res) => {
  try {
    // Accept both illegalUrl and blockedUrl for backend compatibility
    const { studentId, roomId, illegalUrl, blockedUrl, screenshotData, timestamp, studentName } = req.body;

    // Use illegalUrl or blockedUrl (whichever is provided)
    const url = illegalUrl || blockedUrl;
    const { actionType } = req.body; // 'search' or 'navigate' - extension should send this

    // Validate required fields
    if (!studentId || !roomId || !url) {
      console.error("❌ Missing required fields:", { studentId: !!studentId, roomId: !!roomId, url: !!url });
      return res.status(400).send({ 
        success: false,
        message: "Missing required fields: studentId, roomId, and url are required" 
      });
    }

    // ✅ Validate that room exists (check both memory and database)
    let room = rooms[roomId];
    let roomExists = !!room;
    
    // If room doesn't exist in memory, check database as fallback
    if (!roomExists) {
      console.log(`ℹ️ Room ${roomId} not in memory, checking database...`);
      const { roomsCollection } = getCollections();
      const dbRoom = await roomsCollection.findOne({ roomId });
      
      if (dbRoom) {
        console.log(`✅ Room ${roomId} exists in database`);
        // Create room entry in memory if it exists in database
        // This handles cases where examiner hasn't joined yet but room exists
        // Check if exam has started by looking at examStarted flag or startTime
        // If startTime exists and is in the past, consider exam as started
        const examStarted = dbRoom.examStarted === true || 
          (dbRoom.startTime && new Date(dbRoom.startTime) <= new Date());
        
        rooms[roomId] = {
          examiner: null,
          students: [],
          examStarted: examStarted, // Use actual exam status from database
          questionUrl: dbRoom.questionUrl || null
        };
        room = rooms[roomId];
        roomExists = true;
        console.log(`ℹ️ Room ${roomId} created in memory with examStarted=${examStarted} (from database)`);
      } else {
        console.warn(`⚠️ Flag rejected: Room ${roomId} does not exist in memory or database`);
        console.warn(`⚠️ Available rooms in memory:`, Object.keys(rooms));
        return res.status(404).send({ 
          success: false,
          message: "Room not found. Student must join the exam room first.",
          ignored: true
        });
      }
    } else {
      // Room exists in memory - use its examStarted status
      console.log(`✅ Room ${roomId} exists in memory with examStarted=${room.examStarted}`);
    }

    // ✅ Validate that student is actually in the room (more lenient matching)
    const studentInRoom = room.students && room.students.some(
      s => {
        // Check multiple possible matches with type coercion
        const matches = 
          s.studentId === studentId || 
          s.socketId === studentId ||
          String(s.studentId) === String(studentId) ||
          String(s.socketId) === String(studentId) ||
          String(s.studentId).toLowerCase() === String(studentId).toLowerCase();
        return matches;
      }
    );

    // If student not found in room, but room exists, allow the flag anyway
    // (student might have joined via web but socket connection hasn't registered yet)
    if (!studentInRoom && room.students && room.students.length > 0) {
      console.warn(`⚠️ Student ${studentId} not found in room ${roomId} students list`);
      console.warn(`⚠️ Room students:`, room.students?.map(s => ({ studentId: s.studentId, socketId: s.socketId, name: s.name })));
      console.warn(`⚠️ Looking for studentId: "${studentId}" (type: ${typeof studentId})`);
      
      // Try to find the student by checking if they're in the room but with different ID format
      const possibleMatch = room.students?.find(s => 
        String(s.studentId).includes(String(studentId)) || 
        String(s.socketId).includes(String(studentId)) ||
        String(studentId).includes(String(s.studentId)) ||
        String(studentId).includes(String(s.socketId))
      );
      
      if (!possibleMatch) {
        // If room exists but student not registered, still allow flag but log warning
        console.warn(`⚠️ Student ${studentId} not registered in room, but allowing flag anyway (room exists)`);
        // Continue processing - don't reject the flag
      } else {
        console.log(`ℹ️ Found possible match:`, possibleMatch);
      }
    } else if (!studentInRoom && (!room.students || room.students.length === 0)) {
      // Room exists but no students registered yet - allow flag anyway
      console.log(`ℹ️ Room ${roomId} exists but no students registered yet - allowing flag`);
    }

    // ✅ Only accept flags if exam has started
    if (!room.examStarted) {
      console.log(`ℹ️ Flag ignored: Exam not started yet in room ${roomId}`);
      return res.status(200).send({ 
        success: true,
        message: "Flag ignored: Exam has not started yet.",
        ignored: true
      });
    }

    // 🚫 Filter out search queries - only flag actual website visits
    // If actionType is 'search', ignore it (extension should send this)
    // Also check if URL looks like a search query (fallback)
    const isSearchQuery = actionType === 'search' || 
      url.includes('google.com/search') || 
      url.includes('bing.com/search') ||
      url.includes('yahoo.com/search') ||
      url.includes('/search?') ||
      url.match(/^[^/]*\/search/); // Any domain with /search path
    
    if (isSearchQuery) {
      console.log(`🔍 Ignoring search query from student ${studentId}: ${url}`);
      return res.status(200).send({ 
        success: true,
        message: "Search query ignored (not flagged)",
        ignored: true
      });
    }

    // Enhanced logging
    console.log("📤 Receiving flag report:", {
      studentId,
      studentName: studentName || "N/A",
      roomId,
      illegalUrl: illegalUrl || "N/A",
      blockedUrl: blockedUrl || "N/A",
      url,
      hasScreenshot: !!screenshotData,
      screenshotDataLength: screenshotData ? screenshotData.length : 0,
      timestamp: timestamp || "N/A"
    });

    // 🖼️ Better screenshot handling with try-catch
    let screenshotUrl = null;
    if (screenshotData) {
      try {
        // Ensure screenshotData is never undefined
        if (typeof screenshotData !== 'string' || screenshotData.length === 0) {
          console.warn("⚠️ Invalid screenshot data format, skipping upload");
        } else {
          // Rebuild Data URI for Cloudinary upload
          const dataUri = `data:image/jpeg;base64,${screenshotData}`;
          
          // Upload screenshot to Cloudinary
          const uploadResult = await cloudinary.uploader.upload(dataUri, {
            folder: "code_guard_flags",
            public_id: `${studentId}_${Date.now()}`,
          });
          
          screenshotUrl = uploadResult.secure_url;
          console.log(`✅ Screenshot uploaded successfully for student ${studentId}`);
          console.log(`📸 Screenshot URL: ${screenshotUrl}`);
        }
      } catch (screenshotError) {
        console.error("❌ Error uploading screenshot:", screenshotError);
        console.error("❌ Screenshot error details:", {
          message: screenshotError.message,
          http_code: screenshotError.http_code,
          name: screenshotError.name
        });
        // Continue with flag report even if screenshot fails
        console.log("⚠️ Continuing with flag report despite screenshot upload failure");
      }
    } else {
      console.warn("⚠️ No screenshot data provided, continuing with flag report");
    }

    // 🗃️ Save to MongoDB (activityLogs collection)
    const { activityLogsCollection } = getCollections();

    const logEntry = {
      studentId,
      studentName: studentName || null,
      roomId,
      illegalUrl: url, // Store the resolved URL
      blockedUrl: blockedUrl || illegalUrl || url, // Store both for compatibility
      screenshotUrl: screenshotUrl,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    };

    await activityLogsCollection.insertOne(logEntry);
    console.log(`✅ Flag log saved successfully for student ${studentId}`);
    console.log(`📝 Log entry:`, {
      studentId: logEntry.studentId,
      roomId: logEntry.roomId,
      url: logEntry.illegalUrl,
      hasScreenshot: !!logEntry.screenshotUrl,
      timestamp: logEntry.timestamp
    });

    // 📡 Notify the examiner in real-time
    if (rooms[roomId]?.examiner) {
      const examinerSocketId = rooms[roomId].examiner;
      io.to(examinerSocketId).emit("student-flagged", logEntry);
      console.log(`🚨 Student ${studentId} flagged for visiting: ${url}`);
      console.log(`📡 Notification sent to examiner: ${examinerSocketId}`);
    } else {
      console.warn(`⚠️ Examiner not found for room: ${roomId}`);
      console.warn(`⚠️ Available rooms:`, Object.keys(rooms));
    }

    // Improved response
    res.status(200).send({ 
      success: true,
      message: "Flag log received successfully",
      logId: logEntry._id || null
    });

  } catch (err) {
    console.error("❌ Error flagging activity:", err);
    console.error("❌ Error details:", {
      message: err.message,
      stack: err.stack,
      http_code: err.http_code,
      name: err.name
    });
    
    // Improved error handling
    if (err.http_code) {
      return res.status(err.http_code).send({ 
        success: false,
        message: err.message || "Error processing flag report"
      });
    }
    
    res.status(500).send({ 
      success: false,
      message: "Internal server error while processing flag report"
    });
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