import express from "express";
import { getStudentById } from "../controllers/student.controller.js";
import { updateStudentProfile } from "../controllers/student.controller.js";

const router = express.Router();

// GET /api/students/:studentId
router.get("/:studentId", getStudentById);

// PUT /api/students/:studentId
router.put("/:studentId", updateStudentProfile);


export default router;