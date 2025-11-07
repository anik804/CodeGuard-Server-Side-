import { analyticsCache } from "../services/analyticsCache.service.js";

export const getPlatformStats = async (req, res) => {
  try {
    const analytics = await analyticsCache.getPlatformAnalytics();
    res.status(200).json({
      success: true,
      data: analytics.platformStats
    });
  } catch (error) {
    console.error("Error fetching platform stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch platform statistics",
      error: error.message
    });
  }
};

export const getExamAttendanceStats = async (req, res) => {
  try {
    const analytics = await analyticsCache.getPlatformAnalytics();
    res.status(200).json({
      success: true,
      data: analytics.examAttendance
    });
  } catch (error) {
    console.error("Error fetching exam attendance stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch exam attendance statistics",
      error: error.message
    });
  }
};

export const getFlagsPerExam = async (req, res) => {
  try {
    const analytics = await analyticsCache.getPlatformAnalytics();
    res.status(200).json({
      success: true,
      data: analytics.flagsPerExam
    });
  } catch (error) {
    console.error("Error fetching flags per exam:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch flags per exam",
      error: error.message
    });
  }
};

export const getFlaggedStudentsPercentage = async (req, res) => {
  try {
    const analytics = await analyticsCache.getPlatformAnalytics();
    res.status(200).json({
      success: true,
      data: analytics.flaggedPercentage
    });
  } catch (error) {
    console.error("Error fetching flagged students percentage:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch flagged students percentage",
      error: error.message
    });
  }
};

export const getConnectedUsersCount = async (req, res) => {
  try {
    const analytics = await analyticsCache.getPlatformAnalytics();
    res.status(200).json({
      success: true,
      data: analytics.connectedUsers
    });
  } catch (error) {
    console.error("Error fetching connected users count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch connected users count",
      error: error.message
    });
  }
};

export const getMonthlyStats = async (req, res) => {
  try {
    const analytics = await analyticsCache.getPlatformAnalytics();
    res.status(200).json({
      success: true,
      data: analytics.monthlyStats
    });
  } catch (error) {
    console.error("Error fetching monthly stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch monthly statistics",
      error: error.message
    });
  }
};

export const getExamRoomsByExaminer = async (req, res) => {
  try {
    // This endpoint doesn't need caching as it's rarely used
    const { AnalyticsService } = await import("../services/analytics.service.js");
    const stats = await AnalyticsService.getExamRoomsByExaminer();
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error("Error fetching exam rooms by examiner:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch exam rooms by examiner",
      error: error.message
    });
  }
};

export const getInstitutionsCount = async (req, res) => {
  try {
    const analytics = await analyticsCache.getPlatformAnalytics();
    res.status(200).json({
      success: true,
      data: analytics.institutions
    });
  } catch (error) {
    console.error("Error fetching institutions count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch institutions count",
      error: error.message
    });
  }
};

export const getImpactMetrics = async (req, res) => {
  try {
    const analytics = await analyticsCache.getPlatformAnalytics();
    res.status(200).json({
      success: true,
      data: analytics.impactMetrics
    });
  } catch (error) {
    console.error("Error fetching impact metrics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch impact metrics",
      error: error.message
    });
  }
};

export const getAllAnalytics = async (req, res) => {
  try {
    const analytics = await analyticsCache.getPlatformAnalytics();
    
    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error("Error fetching all analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
      error: error.message
    });
  }
};

export const refreshAnalytics = async (req, res) => {
  try {
    const analytics = await analyticsCache.getPlatformAnalytics(true);
    
    res.status(200).json({
      success: true,
      data: analytics,
      message: "Analytics refreshed"
    });
  } catch (error) {
    console.error("Error refreshing analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to refresh analytics",
      error: error.message
    });
  }
};

