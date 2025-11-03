import express from "express";
import * as roomController from "../controllers/room.controller.js";

const router = express.Router();

router.post("/", roomController.createNewRoom);
router.post("/validate", roomController.validateRoomCredentials);
router.post("/:roomId/question", roomController.upload.single('question'), roomController.uploadExamQuestion);
router.get("/:roomId/question", roomController.getExamQuestion);
router.get("/:roomId/question/download", roomController.getExamQuestionProxy);

export default router;