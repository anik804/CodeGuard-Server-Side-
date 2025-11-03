import bcrypt from "bcrypt";
import * as roomModel from "../models/room.model.js";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { cloudinary } from "../config/cloudinary.js";
const saltRounds = 10;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists (temporary storage before Cloudinary upload)
const uploadsDir = path.join(__dirname, '../uploads/exam-questions');
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
    const uniqueName = `${roomId}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});
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
    
    console.log(`📤 PDF Upload Request - Room: ${roomId}`);
    console.log(`📤 File received:`, req.file ? {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      bufferLength: req.file.buffer?.length
    } : 'No file');

    if (!req.file) {
      console.error("❌ No file uploaded");
      return res.status(400).json({ 
        success: false,
        message: "No file uploaded" 
      });
    }

    if (!roomId) {
      console.error("❌ Room ID missing");
      return res.status(400).json({ 
        success: false,
        message: "Room ID is required" 
      });
    }

    // Validate file type
    if (req.file.mimetype !== 'application/pdf') {
      console.error("❌ Invalid file type:", req.file.mimetype);
      return res.status(400).json({ 
        success: false,
        message: "Only PDF files are allowed" 
      });
    }

    // Check if room exists
    const room = await roomModel.findRoomById(roomId);
    if (!room) {
      console.error(`❌ Room not found: ${roomId}`);
      return res.status(404).json({ 
        success: false,
        message: "Room not found" 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: "No file uploaded" 
      });
    }

    const filePath = req.file.path;
    const fileName = req.file.originalname || req.file.filename;

    console.log(`📤 Uploading PDF to Cloudinary...`);
    console.log(`📤 File path: ${filePath}`);

    try {
      // Upload to Cloudinary with resource_type: "raw" for PDFs
      const result = await cloudinary.uploader.upload(filePath, {
        folder: "exam-questions",
        resource_type: "raw",  // ✅ This is crucial for PDFs, ZIPs, etc.
        public_id: `${roomId}_${Date.now()}`,
      });

      console.log(`✅ Cloudinary upload successful!`);
      console.log(`✅ Secure URL: ${result.secure_url}`);

      // Remove local temp file after successful upload
      try {
        fs.unlinkSync(filePath);
        console.log(`✅ Local temp file deleted: ${filePath}`);
      } catch (unlinkError) {
        console.warn(`⚠️ Could not delete temp file: ${unlinkError.message}`);
        // Continue even if deletion fails
      }

      // Save Cloudinary URL in database
      await roomModel.updateRoomQuestion(roomId, result.secure_url, fileName);

      console.log(`✅ PDF upload complete for room: ${roomId}`);

      res.status(200).json({
        success: true,
        message: "PDF uploaded successfully to Cloudinary",
        fileUrl: result.secure_url,
        fileName: fileName
      });
    } catch (cloudinaryError) {
      // Clean up local file if Cloudinary upload fails
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (cleanupError) {
        console.warn(`⚠️ Could not clean up temp file: ${cleanupError.message}`);
      }

      console.error("❌ Cloudinary upload error:", cloudinaryError);
      throw cloudinaryError;
    }
  } catch (err) {
    console.error("❌ Error uploading exam question:", err);
    console.error("❌ Error details:", {
      message: err.message,
      http_code: err.http_code,
      stack: err.stack
    });
    
    res.status(500).json({ 
      success: false,
      message: err.message || "Server error while uploading question",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
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
        message: "Room ID is required" 
      });
    }

    const questionData = await roomModel.getRoomQuestion(roomId);

    if (!questionData) {
      return res.status(404).json({ 
        success: false,
        message: "No exam question found for this room" 
      });
    }

    // Return a flag indicating question exists (for exam start)
    res.status(200).json({
      success: true,
      hasQuestion: true,
      fileName: questionData.fileName,
      url: questionData.url
    });
  } catch (err) {
    console.error("Error fetching exam question:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching question" 
    });
  }
};

// Proxy endpoint to serve PDF files from Cloudinary
export const getExamQuestionProxy = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({ 
        success: false,
        message: "Room ID is required" 
      });
    }

    console.log(`📥 Request to download PDF for room: ${roomId}`);

    const questionData = await roomModel.getRoomQuestion(roomId);

    if (!questionData || !questionData.url) {
      return res.status(404).json({ 
        success: false,
        message: "No exam question found for this room" 
      });
    }

    const cloudinaryUrl = questionData.url;
    const fileName = questionData.fileName || `exam-questions-${roomId}.pdf`;

    console.log(`📥 Fetching PDF from Cloudinary: ${cloudinaryUrl}`);

    // Fetch the PDF from Cloudinary using HTTP/HTTPS
    const https = await import('https');
    const http = await import('http');
    
    const pdfUrl = new URL(cloudinaryUrl);
    const client = pdfUrl.protocol === 'https:' ? https : http;
    
    return new Promise((resolve) => {
      const request = client.get(cloudinaryUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'CodeGuard-Server/1.0'
        }
      }, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302 || response.statusCode === 307 || response.statusCode === 308) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            console.log(`Following redirect to: ${redirectUrl}`);
            const redirectPdfUrl = redirectUrl.startsWith('http') ? new URL(redirectUrl) : new URL(redirectUrl, pdfUrl.origin);
            const redirectClient = redirectPdfUrl.protocol === 'https:' ? https : http;
            const redirectRequest = redirectClient.get(redirectUrl, {
              timeout: 30000,
              headers: {
                'User-Agent': 'CodeGuard-Server/1.0'
              }
            }, (redirectResponse) => {
              if (redirectResponse.statusCode !== 200) {
                console.error(`Failed to fetch PDF after redirect: ${redirectResponse.statusCode}`);
                res.status(redirectResponse.statusCode || 500).json({ 
                  success: false,
                  message: "Failed to fetch PDF from Cloudinary" 
                });
                resolve();
                return;
              }
              handlePDFResponse(redirectResponse);
            });
            redirectRequest.on('error', (error) => {
              console.error("Error fetching PDF after redirect:", error);
              res.status(500).json({ 
                success: false,
                message: "Server error while fetching question" 
              });
              resolve();
            });
            return;
          }
        }

        if (response.statusCode !== 200) {
          console.error(`Failed to fetch PDF from Cloudinary: ${response.statusCode} - ${response.statusMessage}`);
          res.status(response.statusCode || 500).json({ 
            success: false,
            message: `Failed to fetch PDF from Cloudinary (${response.statusCode})` 
          });
          resolve();
          return;
        }

        handlePDFResponse(response);
      });

      const handlePDFResponse = (response) => {
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          try {
            const buffer = Buffer.concat(chunks);
            
            // Verify it's a PDF
            if (buffer.length > 4) {
              const header = buffer.toString('utf8', 0, 4);
              if (header !== '%PDF') {
                console.error("Downloaded file is not a valid PDF. Header:", header);
                res.status(500).json({ 
                  success: false,
                  message: "Invalid PDF file received from Cloudinary" 
                });
                resolve();
                return;
              }
            }
            
            // Set headers for PDF with explicit CORS
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`); // attachment forces download
            res.setHeader('Content-Length', buffer.length);
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
            
            console.log(`✅ Sending PDF (${buffer.length} bytes)`);
            
            // Send the PDF
            res.send(buffer);
            resolve();
          } catch (err) {
            console.error("Error processing PDF buffer:", err);
            res.status(500).json({ 
              success: false,
              message: "Error processing PDF" 
            });
            resolve();
          }
        });
      };

      request.on('error', (error) => {
        console.error("Error fetching PDF from Cloudinary:", error);
        res.status(500).json({ 
          success: false,
          message: "Server error while fetching question" 
        });
        resolve();
      });

      request.on('timeout', () => {
        request.destroy();
        console.error("Timeout while fetching PDF from Cloudinary");
        res.status(504).json({ 
          success: false,
          message: "Request timeout while fetching PDF" 
        });
        resolve();
      });
    });
  } catch (err) {
    console.error("Error serving exam question:", err);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching question" 
    });
  }
};