import express from "express";
import { getStudentById } from "../controllers/student.controller.js";

const router = express.Router();

// GET /api/students/:studentId
router.get("/:studentId", getStudentById);

export default router;