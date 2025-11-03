import express from "express";
import * as roomController from "../controllers/room.controller.js";

const router = express.Router();

// Handle OPTIONS request for CORS preflight
router.options("/:roomId/question/download", (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.status(200).end();
});

router.post("/", roomController.createNewRoom);
router.post("/validate", roomController.validateRoomCredentials);
router.post("/:roomId/question", roomController.upload.single('question'), roomController.uploadExamQuestion);
router.get("/:roomId/question", roomController.getExamQuestion);
router.get("/:roomId/question/download", roomController.getExamQuestionProxy);

export default router;