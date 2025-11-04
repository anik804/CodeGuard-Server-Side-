import express from "express";
import * as roomController from "../controllers/room.controller.js";

const router = express.Router();

// Handle OPTIONS request for CORS preflight
router.options("/:roomId/question/download", (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
  
  if (origin === allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.status(200).end();
});

router.post("/", roomController.createNewRoom);
router.post("/validate", roomController.validateRoomCredentials);
router.put("/:roomId/exam-details", roomController.updateExamDetails);
router.get("/:roomId/exam-details", roomController.getExamDetails);
router.get("/:roomId/students", roomController.getRoomStudents);
router.post("/:roomId/question", roomController.upload.single('question'), roomController.uploadExamQuestion);
router.get("/:roomId/question", roomController.getExamQuestion);
router.get("/:roomId/question/download", roomController.getExamQuestionProxy);

export default router;