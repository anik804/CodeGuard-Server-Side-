import { analyticsCache } from "../services/analyticsCache.service.js";

export const getStudentAnalytics = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required"
      });
    }

    const analytics = await analyticsCache.getStudentAnalytics(studentId);
    
    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error("Error fetching student analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch student analytics",
      error: error.message
    });
  }
};

export const refreshStudentAnalytics = async (req, res) => {
  try {
    const { studentId } = req.params;
    
    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "Student ID is required"
      });
    }

    const analytics = await analyticsCache.getStudentAnalytics(studentId, true);
    
    res.status(200).json({
      success: true,
      data: analytics,
      message: "Student analytics refreshed"
    });
  } catch (error) {
    console.error("Error refreshing student analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to refresh student analytics",
      error: error.message
    });
  }
};

