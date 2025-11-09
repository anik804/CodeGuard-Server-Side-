import { getCollections } from "../config/db.js";
import { imagekit } from "../config/imagekit.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { ObjectId } from "mongodb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads/student-submissions");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for student submissions (PDF and Word)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const { roomId } = req.params;
    const studentId = req.body.studentId || 'unknown';
    const uniqueName = `${roomId}_${studentId}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and Word documents are allowed"), false);
    }
  },
});

// Upload student submission
export const uploadStudentSubmission = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { studentId, studentName } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    if (!roomId || !studentId) {
      return res.status(400).json({
        success: false,
        message: "Room ID and Student ID are required"
      });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname || req.file.filename;
    const fileBuffer = fs.readFileSync(filePath);

    // Upload to ImageKit
    const fileExtension = path.extname(fileName);
    const baseFileName = path.basename(fileName, fileExtension);
    const imagekitFileName = `${roomId}_${studentId}_${Date.now()}_${baseFileName}${fileExtension}`;

    const result = await imagekit.upload({
      file: fileBuffer,
      fileName: imagekitFileName,
      folder: "/student-submissions",
      useUniqueFileName: false,
      tags: [`room-${roomId}`, `student-${studentId}`, "submission"],
    });

    // Clean up local file
    try {
      fs.unlinkSync(filePath);
    } catch (unlinkError) {
      console.warn(`⚠️ Could not delete temp file: ${unlinkError.message}`);
    }

    // Save to database
    const { studentSubmissionsCollection } = getCollections();
    const submission = {
      roomId,
      studentId,
      studentName: studentName || "Student",
      fileId: result.fileId,
      fileName: fileName,
      filePath: result.filePath,
      fileSize: result.size,
      uploadedAt: new Date(),
      status: "pending", // pending, reviewed, graded
      grade: null,
      examinerNotes: null
    };

    const insertResult = await studentSubmissionsCollection.insertOne(submission);

    res.status(200).json({
      success: true,
      message: "Submission uploaded successfully",
      submission: {
        id: insertResult.insertedId.toString(),
        fileName: submission.fileName,
        uploadedAt: submission.uploadedAt
      }
    });
  } catch (err) {
    console.error("❌ Error uploading submission:", err);
    res.status(500).json({
      success: false,
      message: err.message || "Server error while uploading submission"
    });
  }
};

// Get all submissions for a room
export const getRoomSubmissions = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: "Room ID is required"
      });
    }

    const { studentSubmissionsCollection } = getCollections();
    const submissions = await studentSubmissionsCollection
      .find({ roomId })
      .sort({ uploadedAt: -1 })
      .toArray();

    // Convert ObjectId to string for JSON response
    const formattedSubmissions = submissions.map(sub => ({
      ...sub,
      _id: sub._id.toString()
    }));

    res.status(200).json({
      success: true,
      submissions: formattedSubmissions
    });
  } catch (err) {
    console.error("❌ Error fetching submissions:", err);
    res.status(500).json({
      success: false,
      message: "Server error while fetching submissions"
    });
  }
};

// Get download URL for submission
export const getSubmissionDownloadUrl = async (req, res) => {
  try {
    const { submissionId } = req.params;

    if (!submissionId) {
      return res.status(400).json({
        success: false,
        message: "Submission ID is required"
      });
    }

    const { studentSubmissionsCollection } = getCollections();
    const submission = await studentSubmissionsCollection.findOne({
      _id: new ObjectId(submissionId)
    });

    if (!submission) {
      return res.status(404).json({
        success: false,
        message: "Submission not found"
      });
    }

    // Get file details and generate signed URL
    const fileDetails = await imagekit.getFileDetails(submission.fileId);
    const signedUrl = imagekit.url({
      path: fileDetails.filePath,
      signed: true,
      expireSeconds: 3600, // 1 hour
    });

    res.status(200).json({
      success: true,
      url: signedUrl,
      fileName: submission.fileName
    });
  } catch (err) {
    console.error("❌ Error generating download URL:", err);
    res.status(500).json({
      success: false,
      message: "Server error while generating download URL"
    });
  }
};

// Update submission grade/notes (examiner)
export const updateSubmissionGrade = async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { grade, examinerNotes, status } = req.body;

    if (!submissionId) {
      return res.status(400).json({
        success: false,
        message: "Submission ID is required"
      });
    }

    const { studentSubmissionsCollection } = getCollections();
    const updateData = {};
    if (grade !== undefined) updateData.grade = grade;
    if (examinerNotes !== undefined) updateData.examinerNotes = examinerNotes;
    if (status) updateData.status = status;
    updateData.reviewedAt = new Date();

    await studentSubmissionsCollection.updateOne(
      { _id: new ObjectId(submissionId) },
      { $set: updateData }
    );

    res.status(200).json({
      success: true,
      message: "Submission updated successfully"
    });
  } catch (err) {
    console.error("❌ Error updating submission:", err);
    res.status(500).json({
      success: false,
      message: "Server error while updating submission"
    });
  }
};

