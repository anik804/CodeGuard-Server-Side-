// import express from "express";
// import { getAllExams } from "../controllers/examController.js";

// const router = express.Router();

// router.get("/", getAllExams);

// export default router;


import express from "express";
import { getStudentExams } from "../controllers/examinfo.controller";

const router = express.Router();

// GET /api/exams/student/:studentId
router.get("/student/:studentId", getStudentExams);

export default router;
