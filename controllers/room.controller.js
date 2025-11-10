import { RoomService } from "../services/room.service.js";
import * as roomModel from "../models/room.model.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs, { access } from "fs";
import { imagekit } from "../config/imagekit.js";
import { rooms } from "../services/socket.service.js";
import { getCollections } from "../config/db.js";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists (temporary storage before Cloudinary upload)
const uploadsDir = path.join(__dirname, "../uploads/exam-questions");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads (disk storage - temporary before Cloudinary)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const { roomId } = req.params;
    const uniqueName = `${roomId}_${Date.now()}${path.extname(
      file.originalname
    )}`;
    cb(null, uniqueName);
  },
});
export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are allowed"), false);
    }
  },
});

export const createNewRoom = async (req, res) => {
  try {
    const { roomId, password, ...otherData } = req.body;
    if (!roomId || !password) {
      return res
        .status(400)
        .send({ message: "Both roomId and password are required." });
    }

    await RoomService.createRoom({ roomId, password, ...otherData });
    res
      .status(201)
      .send({ message: "Room created successfully", roomId });
  } catch (err) {
    console.error(err);
    if (err.message === "A room with this ID already exists.") {
      return res.status(409).send({ message: err.message });
    }
    res.status(500).send({ message: "Server error while creating room" });
  }
};

// Update exam details
export const updateExamDetails = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { courseName, examDuration } = req.body;

    if (!roomId) {
      return res.status(400).send({ message: "Room ID is required." });
    }

    await RoomService.updateExamDetails(roomId, { courseName, examDuration });
    res.status(200).send({ message: "Exam details updated successfully" });
  } catch (err) {
    console.error(err);
    if (err.message === "Room not found.") {
      return res.status(404).send({ message: err.message });
    }
    res.status(500).send({ message: "Server error while updating exam details" });
  }
};

// Get exam details
export const getExamDetails = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await RoomService.getExamDetails(roomId);
    
    res.status(200).json({
      success: true,
      room: room
    });
  } catch (err) {
    console.error(err);
    if (err.message === "Room not found.") {
      return res.status(404).send({ message: err.message });
    }
    res.status(500).send({ message: "Server error while fetching exam details" });
  }
};

// Get rooms by examiner
export const getRoomsByExaminer = async (req, res) => {
  try {
    const { examinerId, examinerUsername } = req.query;
    
    console.log("🔍 Fetching rooms for examiner:", { examinerId, examinerUsername });
    
    if (!examinerId && !examinerUsername) {
      return res.status(400).send({ 
        success: false,
        message: "examinerId or examinerUsername is required" 
      });
    }

    const { roomsCollection } = getCollections();
    
    // Build query - use OR logic to check both fields
    const query = {
      $or: []
    };
    
    if (examinerId) {
      query.$or.push({ examinerId });
    }
    if (examinerUsername) {
      query.$or.push({ examinerUsername });
    }
    
    // If only one provided, simplify query
    if (query.$or.length === 1) {
      const rooms = await roomsCollection.find(query.$or[0]).sort({ createdAt: -1 }).toArray();
      console.log(`✅ Found ${rooms.length} rooms for examiner`);
      return res.status(200).json({
        success: true,
        rooms: rooms
      });
    }
    
    const rooms = await roomsCollection.find(query).sort({ createdAt: -1 }).toArray();
    console.log(`✅ Found ${rooms.length} rooms for examiner`);
    
    res.status(200).json({
      success: true,
      rooms: rooms
    });
  } catch (err) {
    console.error("❌ Error fetching rooms by examiner:", err);
    res.status(500).send({ 
      success: false,
      message: "Internal server error while fetching rooms" 
    });
  }
};

export const validateRoomCredentials = async (req, res) => {
  try {
    const { roomId, password } = req.body;
    if (!roomId || !password) {
      return res
        .status(400)
        .send({ message: "Both roomId and password are required." });
    }

    await RoomService.validateRoomCredentials(roomId, password);
    res.status(200).send({ success: true, message: "Credentials are valid." });
  } catch (err) {
    console.error(err);
    if (err.message === "Room not found.") {
      return res.status(404).send({ success: false, message: err.message });
    }
    if (err.message === "Invalid password.") {
      return res.status(401).send({ success: false, message: err.message });
    }
    res.status(500).send({ message: "Server error while validating credentials" });
  }
};

// Upload exam question PDF
export const uploadExamQuestion = async (req, res) => {
  try {
    const { roomId } = req.params;

    console.log(`📤 PDF Upload Request - Room: ${roomId}`);
    console.log(
      `📤 File received:`,
      req.file
        ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            bufferLength: req.file.buffer?.length,
          }
        : "No file"
    );

    if (!req.file) {
      console.error("❌ No file uploaded");
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    if (!roomId) {
      console.error("❌ Room ID missing");
      return res.status(400).json({
        success: false,
        message: "Room ID is required",
      });
    }

    // Validate file type
    if (req.file.mimetype !== "application/pdf") {
      console.error("❌ Invalid file type:", req.file.mimetype);
      return res.status(400).json({
        success: false,
        message: "Only PDF files are allowed",
      });
    }

    // Check if room exists
    const room = await RoomService.getExamDetails(roomId);
    if (!room) {
      console.error(`❌ Room not found: ${roomId}`);
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Get absolute file path (req.file.path is already the full path from multer)
    const filePath = req.file.path;
    const fileName = req.file.originalname || req.file.filename;

    console.log(`📤 Preparing to upload PDF to Cloudinary...`);
    console.log(`📤 File path: ${filePath}`);
    console.log(`📤 Original filename: ${fileName}`);
    console.log(`📤 File size: ${req.file.size} bytes`);

    // Verify file exists before uploading
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File does not exist at path: ${filePath}`);
      return res.status(500).json({
        success: false,
        message: "File was not saved correctly. Please try again.",
      });
    }

    // Verify file is not empty
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      console.error(`❌ File is empty: ${filePath}`);
      return res.status(500).json({
        success: false,
        message: "File is empty. Please check your file and try again.",
      });
    }

    console.log(`📤 File verified. Size on disk: ${stats.size} bytes`);

    // Verify ImageKit is configured
    if (
      !process.env.IMAGEKIT_PUBLIC_KEY ||
      !process.env.IMAGEKIT_PRIVATE_KEY ||
      !process.env.IMAGEKIT_URL_ENDPOINT
    ) {
      console.error("❌ ImageKit is not properly configured!");
      console.error("❌ Missing:", {
        publicKey: !process.env.IMAGEKIT_PUBLIC_KEY,
        privateKey: !process.env.IMAGEKIT_PRIVATE_KEY,
        urlEndpoint: !process.env.IMAGEKIT_URL_ENDPOINT,
      });
      return res.status(500).json({
        success: false,
        message:
          "ImageKit configuration is missing. Please check your environment variables.",
      });
    }

    console.log(
      `✅ ImageKit configured - URL Endpoint: ${process.env.IMAGEKIT_URL_ENDPOINT}`
    );

      try {
        // Upload to ImageKit
        console.log(`📤 Starting ImageKit upload...`);

        // Read file as buffer
        const fileBuffer = fs.readFileSync(filePath);
        
        // Prepare file name for ImageKit
        const fileExtension = path.extname(fileName);
        const baseFileName = path.basename(fileName, fileExtension);
        const imagekitFileName = `${roomId}_${Date.now()}_${baseFileName}${fileExtension}`;

        // Upload to ImageKit
        const result = await imagekit.upload({
          file: fileBuffer, // File as buffer
          fileName: imagekitFileName,
          folder: "/exam-questions", // Folder path in ImageKit
          useUniqueFileName: false, // Use our custom filename
          tags: [`room-${roomId}`, "exam-question", "pdf"], // Tags for organization
        });

        console.log(`✅ ImageKit upload successful!`);
        console.log(`✅ Upload result:`, {
          fileId: result.fileId,
          name: result.name,
          url: result.url,
          filePath: result.filePath,
          size: result.size,
          fileType: result.fileType,
          createdAt: result.createdAt
        });
      
      // Verify fileId exists
      if (!result.fileId) {
        console.error(`❌ ERROR: fileId is missing from upload result!`);
        throw new Error("Upload succeeded but fileId is missing");
      }
      
      console.log(`✅ File uploaded to ImageKit: ${result.filePath}`);
      console.log(`✅ File ID saved: ${result.fileId}`);

      // Remove local temp file after successful upload
      try {
        fs.unlinkSync(filePath);
        console.log(`✅ Local temp file deleted: ${filePath}`);
      } catch (unlinkError) {
        console.warn(`⚠️ Could not delete temp file: ${unlinkError.message}`);
        // Continue even if deletion fails
      }

      // Save the fileId and filePath (NOT the URL) - we'll generate signed URLs on demand
      await RoomService.updateRoomQuestion(
        roomId,
        result.fileId, // Save ImageKit fileId (equivalent to public_id)
        fileName,
        "raw" // Resource type for ImageKit (always "raw" for PDFs)
      );

      console.log(`✅ PDF upload complete for room: ${roomId}`);
      console.log(`✅ Saved to database - fileId: ${result.fileId}`);

      res.status(200).json({
        success: true,
        message: "PDF uploaded successfully",
        fileId: result.fileId, // Return for debugging
        filePath: result.filePath,
        url: result.url // Return URL for verification
      });
    } catch (imagekitError) {
      // Clean up local file if ImageKit upload fails
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🧹 Cleaned up temp file after error`);
        }
      } catch (cleanupError) {
        console.warn(
          `⚠️ Could not clean up temp file: ${cleanupError.message}`
        );
      }

      console.error("❌ ImageKit upload error:", imagekitError);
      console.error("❌ Error name:", imagekitError.name);
      console.error("❌ Error message:", imagekitError.message);
      console.error("❌ Error response:", imagekitError.response);
      console.error("❌ Error stack:", imagekitError.stack);

      // Provide more helpful error message
      let errorMessage = "Failed to upload PDF to ImageKit";
      if (imagekitError.message) {
        errorMessage = imagekitError.message;
      } else if (imagekitError.response?.message) {
        errorMessage = imagekitError.response.message;
      }

      throw new Error(errorMessage);
    }
  } catch (err) {
    console.error("❌ Error uploading exam question:", err);
    console.error("❌ Error details:", {
      message: err.message,
      http_code: err.http_code,
      stack: err.stack,
    });

    res.status(500).json({
      success: false,
      message: err.message || "Server error while uploading question",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
};

// Get exam question for a room
export const getExamQuestion = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: "Room ID is required",
      });
    }

    const questionData = await RoomService.getRoomQuestion(roomId);

    if (!questionData) {
      return res.status(404).json({
        success: false,
        message: "No exam question found for this room",
      });
    }

    // Return a flag indicating question exists (for exam start)
    // Note: We don't return the URL here - use the download endpoint to get signed URLs
    res.status(200).json({
      success: true,
      hasQuestion: true,
      fileName: questionData.fileName,
      // URL is not returned - use /question/download endpoint to get signed URL
    });
  } catch (err) {
    console.error("Error fetching exam question:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching question",
    });
  }
};

// Generate secure, signed download URL for PDF files from ImageKit
// This is much more efficient than proxying - client downloads directly from ImageKit
export const getExamQuestionProxy = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: "Room ID is required",
      });
    }

    console.log(`📥 Request to download PDF for room: ${roomId}`);

    // Fetch the fileId from your database
    const questionData = await RoomService.getRoomQuestion(roomId);

    if (!questionData || !questionData.public_id) {
      return res.status(404).json({
        success: false,
        message: "No exam question found for this room",
      });
    }

    // This is the file's ID in ImageKit (stored as public_id in DB for compatibility)
    const fileId = questionData.public_id;
    // This is the original filename you saved
    const fileName = questionData.fileName || `exam-question-${roomId}.pdf`;

    // Get file details first to get exact filePath
    // Then generate a secure, signed URL that expires in 1 hour (3600s)
    try {
      const fileDetails = await imagekit.getFileDetails(fileId);
      
      if (!fileDetails || !fileDetails.filePath) {
        throw new Error("File details not found in ImageKit");
      }

      const signedUrl = imagekit.url({
        path: fileDetails.filePath,
        signed: true,
        expireSeconds: 3600, // Expires in 1 hour
      });
      
      console.log(`✅ Generated secure download URL for user.`);

      // Set CORS headers
      const origin = req.headers.origin;
      const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";

      if (origin === allowedOrigin) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
      }
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Authorization, Content-Type"
      );

      // Send the URL to the client - they will download directly from ImageKit
      res.status(200).json({
        success: true,
        url: signedUrl, // The client will use this URL
        fileName: fileName,
      });
    } catch (fileError) {
      console.error("Error fetching file details:", fileError);
      throw new Error("Failed to generate download URL");
    }
  } catch (err) {
    console.error("Error generating signed URL:", err);
    res.status(500).json({
      success: false,
      message: "Server error while preparing question",
    });
  }
};

// Get paginated students list for a room
export const getRoomStudents = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    if (!roomId) {
      return res.status(400).send({ 
        success: false,
        message: "Room ID is required" 
      });
    }

    // Get students from socket service
    const room = rooms[roomId];
    if (!room) {
      return res.status(404).send({ 
        success: false,
        message: "Room not found" 
      });
    }

    const students = room.students || [];
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const totalStudents = students.length;
    
    // Paginate students
    const paginatedStudents = students
      .slice(skip, skip + limitNum)
      .map(s => ({
        socketId: s.socketId,
        studentId: s.studentId,
        name: s.name,
        joinedAt: s.joinedAt
      }));

    const totalPages = Math.ceil(totalStudents / limitNum);

    res.status(200).send({
      success: true,
      students: paginatedStudents,
      pagination: {
        currentPage: pageNum,
        totalPages: totalPages,
        totalStudents: totalStudents,
        limit: limitNum,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });
  } catch (err) {
    console.error("❌ Error fetching students:", err);
    res.status(500).send({ 
      success: false,
      message: "Internal server error" 
    });
  }
};

// Export attendance as CSV
export const exportAttendance = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).send({ 
        success: false,
        message: "Room ID is required" 
      });
    }

    // Get room details
    const room = await RoomService.getExamDetails(roomId);
    if (!room) {
      return res.status(404).send({ 
        success: false,
        message: "Room not found" 
      });
    }

    // Get collections
    const { activityLogsCollection, studentSubmissionsCollection } = getCollections();

    // Get all students who joined (from socket service or activity logs)
    const socketRoom = rooms[roomId];
    const socketStudents = socketRoom?.students || [];
    
    // Get all unique students from activity logs (in case socket data is cleared)
    const allActivityLogs = await activityLogsCollection.find({ roomId }).toArray();
    
    // Create a map of student names from activity logs (most recent name per student)
    const studentNamesFromLogs = new Map();
    allActivityLogs.forEach(log => {
      if (log.studentId && log.studentName) {
        const existing = studentNamesFromLogs.get(log.studentId);
        // Use the most recent name if multiple entries exist
        if (!existing || 
            (log.timestamp && existing.timestamp && new Date(log.timestamp) > new Date(existing.timestamp))) {
          studentNamesFromLogs.set(log.studentId, {
            name: log.studentName,
            timestamp: log.timestamp || new Date()
          });
        }
      }
    });
    
    const studentsFromLogs = [...new Set(allActivityLogs.map(log => ({
      studentId: log.studentId,
      studentName: log.studentName || "Unknown",
      joinedAt: log.timestamp
    })))];

    // Merge students from socket and logs, prioritizing socket data
    const allStudentsMap = new Map();
    
    // Add socket students first (most current)
    socketStudents.forEach(student => {
      allStudentsMap.set(student.studentId, {
        studentId: student.studentId,
        name: student.name || "Unknown",
        joinedAt: student.joinedAt || new Date(),
        source: 'socket'
      });
    });
    
    // Add students from logs if not already present
    studentsFromLogs.forEach(student => {
      if (!allStudentsMap.has(student.studentId)) {
        allStudentsMap.set(student.studentId, {
          studentId: student.studentId,
          name: student.studentName || "Unknown",
          joinedAt: student.joinedAt || new Date(),
          source: 'logs'
        });
      }
    });

    const allStudents = Array.from(allStudentsMap.values());

    // Get flagged students
    const flaggedStudents = await activityLogsCollection.distinct("studentId", { roomId });
    const flaggedSet = new Set(flaggedStudents);

    // Get students who uploaded work
    const submissions = await studentSubmissionsCollection.find({ roomId }).toArray();
    const studentsWithSubmissions = new Set(submissions.map(s => s.studentId));
    
    // Create a map of student names from submissions (in case name is missing elsewhere)
    const studentNamesFromSubmissions = new Map();
    submissions.forEach(sub => {
      if (sub.studentId && sub.studentName) {
        studentNamesFromSubmissions.set(sub.studentId, sub.studentName);
      }
    });

    // Track students who left with permission (from leave-request-approved events)
    // We'll check if student is not in socket room but has activity logs (likely left with permission)
    const studentsWhoLeft = new Set();
    socketStudents.forEach(student => {
      // If student is still in socket room, they didn't leave
      // If not in socket room but has logs, they likely left
    });
    
    // For now, mark students as "Present" if they're in socket room OR have submissions
    // Mark as "Left with Permission" if they have submissions but not in socket room
    // Mark as "Present" if exam ended and they were in room at that time

    // Prepare CSV data
    const csvRows = [];
    csvRows.push("Student ID,Student Name,Joined At,Attendance Status,Uploaded Work,Flagged");
    
    allStudents.forEach(student => {
      const joinedAt = student.joinedAt ? new Date(student.joinedAt).toLocaleString() : "N/A";
      const isFlagged = flaggedSet.has(student.studentId);
      const hasSubmission = studentsWithSubmissions.has(student.studentId);
      const isStillInRoom = socketStudents.some(s => s.studentId === student.studentId);
      
      // Get student name - prioritize from socket, then submissions, then logs
      let studentName = student.name || "Unknown";
      
      // If still unknown, try to get from socket students (most current)
      if (!studentName || studentName === "Unknown") {
        const socketStudent = socketStudents.find(s => s.studentId === student.studentId);
        if (socketStudent && socketStudent.name) {
          studentName = socketStudent.name;
        }
      }
      
      // If still unknown, try to get name from submissions
      if (!studentName || studentName === "Unknown") {
        const nameFromSubmissions = studentNamesFromSubmissions.get(student.studentId);
        if (nameFromSubmissions) {
          studentName = nameFromSubmissions;
        }
      }
      
      // If still unknown, try to get name from activity logs
      if (!studentName || studentName === "Unknown") {
        const nameFromLogs = studentNamesFromLogs.get(student.studentId);
        if (nameFromLogs && nameFromLogs.name) {
          studentName = nameFromLogs.name;
        }
      }
      
      // Determine attendance status
      let attendanceStatus = "Present";
      if (hasSubmission && !isStillInRoom) {
        attendanceStatus = "Left with Permission";
      } else if (hasSubmission) {
        attendanceStatus = "Present (Work Submitted)";
      } else if (isStillInRoom) {
        attendanceStatus = "Present";
      } else {
        // Student not in room and no submission - mark as present if they have activity logs
        attendanceStatus = "Present";
      }
      
      csvRows.push(
        `"${student.studentId || 'N/A'}","${studentName || 'Unknown'}","${joinedAt}","${attendanceStatus}","${hasSubmission ? 'Yes' : 'No'}","${isFlagged ? 'Yes' : 'No'}"`
      );
    });

    // Add summary at the end
    csvRows.push("");
    csvRows.push(`Total Students,${allStudents.length}`);
    csvRows.push(`Students Present,${socketStudents.length}`);
    csvRows.push(`Students with Submissions,${studentsWithSubmissions.size}`);
    csvRows.push(`Flagged Students,${flaggedStudents.length}`);
    csvRows.push(`Normal Students,${allStudents.length - flaggedStudents.length}`);

    const csvContent = csvRows.join("\n");

    // Set headers for CSV download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="attendance_${roomId}_${Date.now()}.csv"`);
    res.status(200).send(csvContent);
  } catch (err) {
    console.error("❌ Error exporting attendance:", err);
    res.status(500).send({ 
      success: false,
      message: "Internal server error while exporting attendance" 
    });
  }
};