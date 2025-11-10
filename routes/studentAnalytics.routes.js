import express from "express";
import * as studentAnalyticsController from "../controllers/studentAnalytics.controller.js";

const router = express.Router();

// Get student analytics (cached)
router.get("/:studentId", studentAnalyticsController.getStudentAnalytics);

// Refresh student analytics (force refresh)
router.post("/:studentId/refresh", studentAnalyticsController.refreshStudentAnalytics);

export default router;

