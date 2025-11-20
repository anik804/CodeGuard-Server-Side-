import express from "express";
import * as roomController from "../controllers/room.controller.js";
import { clientConfig } from "../config/client.config.js";

const router = express.Router();

// Handle OPTIONS request for CORS preflight
router.options("/:roomId/question/download", (req, res) => {
  const origin = req.headers.origin;
  const allowedOrigins = clientConfig.allowedOrigins;
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.status(200).end();
});

router.post("/", roomController.createNewRoom);
router.get("/by-examiner", roomController.getRoomsByExaminer);
router.post("/validate", roomController.validateRoomCredentials);
router.put("/:roomId/exam-details", roomController.updateExamDetails);
router.get("/:roomId/exam-details", roomController.getExamDetails);
router.get("/:roomId/students", roomController.getRoomStudents);
router.get("/:roomId/attendance/export", roomController.exportAttendance);
router.post("/:roomId/question", roomController.upload.single('question'), roomController.uploadExamQuestion);
router.get("/:roomId/question", roomController.getExamQuestion);
router.get("/:roomId/question/download", roomController.getExamQuestionProxy);

export default router;