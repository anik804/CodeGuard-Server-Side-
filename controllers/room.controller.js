import bcrypt from "bcrypt";
import * as roomModel from "../models/room.model.js";
import { cloudinary } from "../config/cloudinary.js";
import multer from "multer";
const saltRounds = 10;

// Configure multer for file uploads (memory storage for Cloudinary)
const storage = multer.memoryStorage();
export const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

export const createNewRoom = async (req, res) => {
  try {
    const { roomId, password } = req.body;
    if (!roomId || !password) {
      return res
        .status(400)
        .send({ message: "Both roomId and password are required." });
    }

    const existingRoom = await roomModel.findRoomById(roomId);
    if (existingRoom) {
      return res
        .status(409)
        .send({ message: "A room with this ID already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newRoom = {
      roomId: roomId,
      password: hashedPassword,
      createdAt: new Date(),
    };

    await roomModel.createRoom(newRoom);
    res
      .status(201)
      .send({ message: "Room created successfully", roomId: newRoom.roomId });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Server error while creating room" });
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

    const room = await roomModel.findRoomById(roomId);

    if (!room) {
      return res
        .status(404)
        .send({ success: false, message: "Room not found." });
    }

    const isMatch = await bcrypt.compare(password, room.password);

    if (isMatch) {
      res
        .status(200)
        .send({ success: true, message: "Credentials are valid." });
    } else {
      res.status(401).send({ success: false, message: "Invalid password." });
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .send({ message: "Server error while validating credentials" });
  }
};

// Upload exam question PDF
export const uploadExamQuestion = async (req, res) => {
  try {
    const { roomId } = req.params;
    
    if (!req.file) {
      return res.status(400).send({ message: "No file uploaded" });
    }

    if (!roomId) {
      return res.status(400).send({ message: "Room ID is required" });
    }

    // Check if room exists
    const room = await roomModel.findRoomById(roomId);
    if (!room) {
      return res.status(404).send({ message: "Room not found" });
    }

    // Upload PDF to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: 'code_guard_exam_questions',
          public_id: `${roomId}_question_${Date.now()}`,
          format: 'pdf',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      uploadStream.end(req.file.buffer);
    });

    // Save question URL to room
    await roomModel.updateRoomQuestion(roomId, uploadResult.secure_url);

    res.status(200).send({
      success: true,
      message: "Exam question uploaded successfully",
      questionUrl: uploadResult.secure_url
    });
  } catch (err) {
    console.error("Error uploading exam question:", err);
    res.status(500).send({ message: "Server error while uploading question" });
  }
};

// Get exam question for a room
export const getExamQuestion = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).send({ message: "Room ID is required" });
    }

    const questionUrl = await roomModel.getRoomQuestion(roomId);

    if (!questionUrl) {
      return res.status(404).send({ 
        success: false,
        message: "No exam question found for this room" 
      });
    }

    res.status(200).send({
      success: true,
      questionUrl
    });
  } catch (err) {
    console.error("Error fetching exam question:", err);
    res.status(500).send({ message: "Server error while fetching question" });
  }
};

// Proxy endpoint to serve PDF files (fixes CORS and authentication issues)
export const getExamQuestionProxy = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).send({ message: "Room ID is required" });
    }

    const questionUrl = await roomModel.getRoomQuestion(roomId);

    if (!questionUrl) {
      return res.status(404).send({ 
        success: false,
        message: "No exam question found for this room" 
      });
    }

    // Fetch the PDF from Cloudinary using Node.js https/http
    const https = await import('https');
    const http = await import('http');
    
    const pdfUrl = new URL(questionUrl);
    const client = pdfUrl.protocol === 'https:' ? https : http;
    
    return new Promise((resolve) => {
      const request = client.get(questionUrl, (response) => {
        if (response.statusCode !== 200) {
          res.status(response.statusCode || 500).send({ message: "Failed to fetch PDF" });
          resolve();
          return;
        }

        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          
          // Set headers for PDF
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="exam-questions-${roomId}.pdf"`);
          res.setHeader('Content-Length', buffer.length);
          res.setHeader('Cache-Control', 'public, max-age=3600');
          
          // Send the PDF
          res.send(buffer);
          resolve();
        });
      });

      request.on('error', (error) => {
        console.error("Error fetching PDF:", error);
        res.status(500).send({ message: "Server error while fetching question" });
        resolve();
      });
    });
  } catch (err) {
    console.error("Error proxying exam question:", err);
    res.status(500).send({ message: "Server error while fetching question" });
  }
};