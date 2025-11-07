import express from "express";
import * as analyticsController from "../controllers/analytics.controller.js";

const router = express.Router();

// Get all analytics in one call (cached)
router.get("/", analyticsController.getAllAnalytics);

// Refresh all analytics (force refresh)
router.post("/refresh", analyticsController.refreshAnalytics);

// Individual analytics endpoints (all cached)
router.get("/platform-stats", analyticsController.getPlatformStats);
router.get("/exam-attendance", analyticsController.getExamAttendanceStats);
router.get("/flags-per-exam", analyticsController.getFlagsPerExam);
router.get("/flagged-percentage", analyticsController.getFlaggedStudentsPercentage);
router.get("/connected-users", analyticsController.getConnectedUsersCount);
router.get("/monthly-stats", analyticsController.getMonthlyStats);
router.get("/rooms-by-examiner", analyticsController.getExamRoomsByExaminer);
router.get("/institutions", analyticsController.getInstitutionsCount);
router.get("/impact", analyticsController.getImpactMetrics);

export default router;

