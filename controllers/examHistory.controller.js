// controllers/examHistory.controller.js
import * as examSummaryModel from '../models/examSummary.model.js';

/**
 * -----------------------------------------------------
 *  Examiner Exam History (No Pagination)
 * -----------------------------------------------------
 */
export const getExaminerExamHistory = async (req, res) => {
  try {
    const { examinerId, examinerUsername } = req.query;

    if (!examinerId && !examinerUsername) {
      return res.status(400).json({
        success: false,
        message: "examinerId or examinerUsername is required"
      });
    }

    const summaries = await examSummaryModel.getExaminerExamSummaries(
      examinerId,
      examinerUsername
    );

    const history = summaries.map(summary => ({
      id: summary._id,
      roomId: summary.roomId,
      examName: summary.examName || summary.courseName || summary.roomId,
      courseName: summary.courseName,
      date: summary.examEndedAt || summary.examStartedAt || null,

      // UI fields
      students: summary.totalStudentsJoined || 0,
      alerts: summary.flaggedStudentsCount || 0,
      submissions: summary.submissionsCount || 0,
      status: summary.status || "completed",

      // timing
      duration: summary.examDuration,
      startedAt: summary.examStartedAt,
      endedAt: summary.examEndedAt,

      // examiner info
      examinerName: summary.examinerName,
      examinerUsername: summary.examinerUsername,
    }));

    return res.status(200).json({
      success: true,
      total: history.length,
      data: history
    });

  } catch (error) {
    console.error("Error fetching examiner exam history:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch exam history",
      error: error.message
    });
  }
};


/**
 * -----------------------------------------------------
 *  Student Exam History (Server-side Pagination)
 * -----------------------------------------------------
 */
export const getStudentExamHistory = async (req, res) => {
  try {
    const { studentId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 6;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: "studentId is required"
      });
    }

    const { docs, pagination } =
      await examSummaryModel.getStudentExamSummariesPaginated(
        studentId,
        page,
        limit
      );

    const history = docs.map(summary => {
      const studentData = summary.students?.find(s => s.studentId === studentId);

      return {
        id: summary._id,
        roomId: summary.roomId,

        examName: summary.examName || summary.courseName || summary.roomId,
        courseName: summary.courseName,

        examinerName: summary.examinerName || "Unknown",
        examinerUsername: summary.examinerUsername,

        examDate: summary.examEndedAt || summary.examStartedAt || null,

        totalStudents: summary.totalStudentsJoined || 0,
        totalFlagged: summary.flaggedStudentsCount || 0,
        submissionsCount: summary.submissionsCount || 0,
        status: summary.status || "completed",

        // student submitted?
        submitted: studentData ? studentData.submissionsCount > 0 : false,

        // timing
        startedAt: summary.examStartedAt,
        endedAt: summary.examEndedAt,
      };
    });

    return res.status(200).json({
      success: true,
      data: history,
      pagination
    });

  } catch (error) {
    console.error("Error fetching student exam history:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch exam history",
      error: error.message
    });
  }
};


/**
 * -----------------------------------------------------
 *  Single Room Summary Details
 * -----------------------------------------------------
 */
export const getExamSummaryDetails = async (req, res) => {
  try {
    const { roomId } = req.params;

    if (!roomId) {
      return res.status(400).json({
        success: false,
        message: "roomId is required"
      });
    }

    const summary = await examSummaryModel.getExamSummaryByRoomId(roomId);

    if (!summary) {
      return res.status(404).json({
        success: false,
        message: "Exam summary not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error("Error fetching exam summary:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch exam summary",
      error: error.message
    });
  }
};


// import * as examSummaryModel from '../models/examSummary.model.js';
// import { getCollections } from '../config/db.js';

// Get examiner's exam history
// export const getExaminerExamHistory = async (req, res) => {
//   try {
//     console.log('📋 Exam history endpoint hit:', req.query);
//     const { examinerId, examinerUsername } = req.query;
    
//     if (!examinerId && !examinerUsername) {
//       return res.status(400).json({
//         success: false,
//         message: "examinerId or examinerUsername is required"
//       });
//     }

//     console.log('🔍 Fetching exam summaries for:', { examinerId, examinerUsername });
//     const summaries = await examSummaryModel.getExaminerExamSummaries(examinerId, examinerUsername);
//     console.log('✅ Found', summaries.length, 'exam summaries');
    
//     // Format for frontend
//     const history = summaries.map(summary => ({
//       id: summary._id,
//       roomId: summary.roomId,
//       title: summary.examName || summary.courseName || summary.roomId,
//       date: summary.examEndedAt || summary.examStartedAt,
//       students: summary.totalStudentsJoined || 0,
//       alerts: summary.flaggedStudentsCount || 0,
//       submissions: summary.submissionsCount || 0,
//       status: summary.status || 'completed',
//       duration: summary.examDuration,
//       startedAt: summary.examStartedAt,
//       endedAt: summary.examEndedAt,
//       courseName: summary.courseName,
//       examName: summary.examName,
//     }));

//     res.status(200).json({
//       success: true,
//       data: history,
//       total: history.length
//     });
//   } catch (error) {
//     console.error("Error fetching examiner exam history:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch exam history",
//       error: error.message
//     });
//   }
// };

// // Get student's exam history
// export const getStudentExamHistory = async (req, res) => {
//   try {
//     const { studentId } = req.query;
    
//     if (!studentId) {
//       return res.status(400).json({
//         success: false,
//         message: "studentId is required"
//       });
//     }

//     const summaries = await examSummaryModel.getStudentExamSummaries(studentId);
    
//     // Format for frontend
//     const history = summaries.map(summary => ({
//       id: summary._id,
//       roomId: summary.roomId,
//       examName: summary.examName || summary.courseName || summary.roomId,
//       examinerName: summary.examinerName || summary.examinerUsername || 'Unknown',
//       examinerUsername: summary.examinerUsername,
//       examDate: summary.examEndedAt || summary.examStartedAt,
//       totalStudents: summary.totalStudentsJoined || 0,
//       status: summary.status || 'completed',
//       submitted: summary.students?.some(s => s.studentId === studentId && 
//         summary.studentsWithSubmissions > 0) || false,
//       startedAt: summary.examStartedAt,
//       endedAt: summary.examEndedAt,
//       courseName: summary.courseName,
//     }));

//     res.status(200).json({
//       success: true,
//       data: history,
//       total: history.length
//     });
//   } catch (error) {
//     console.error("Error fetching student exam history:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch exam history",
//       error: error.message
//     });
//   }
// };

// // Get detailed exam summary
// export const getExamSummaryDetails = async (req, res) => {
//   try {
//     const { roomId } = req.params;
    
//     if (!roomId) {
//       return res.status(400).json({
//         success: false,
//         message: "roomId is required"
//       });
//     }

//     const summary = await examSummaryModel.getExamSummaryByRoomId(roomId);
    
//     if (!summary) {
//       return res.status(404).json({
//         success: false,
//         message: "Exam summary not found"
//       });
//     }

//     res.status(200).json({
//       success: true,
//       data: summary
//     });
//   } catch (error) {
//     console.error("Error fetching exam summary:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to fetch exam summary",
//       error: error.message
//     });
//   }
// };

