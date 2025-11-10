import { getCollections } from "../config/db.js";

export class AnalyticsService {
  /**
   * Get platform overview statistics
   */
  static async getPlatformStats() {
    const { studentsCollection, examinersCollection, roomsCollection, activityLogsCollection } = getCollections();

    const [
      totalStudents,
      totalExaminers,
      totalRooms,
      totalFlags,
      activeRooms
    ] = await Promise.all([
      studentsCollection.countDocuments(),
      examinersCollection.countDocuments(),
      roomsCollection.countDocuments(),
      activityLogsCollection.countDocuments(),
      roomsCollection.countDocuments({ createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } })
    ]);

    return {
      totalStudents,
      totalExaminers,
      totalRooms,
      totalFlags,
      activeRooms
    };
  }

  /**
   * Get exam attendance statistics
   */
  static async getExamAttendanceStats(roomId = null) {
    const { roomsCollection, activityLogsCollection } = getCollections();
    // Import rooms dynamically to avoid circular dependency
    const socketModule = await import("../services/socket.service.js");
    const rooms = socketModule.rooms;

    let query = {};
    if (roomId) {
      query.roomId = roomId;
    }

    // Get all rooms with examName field
    const allRooms = await roomsCollection.find(query, {
      projection: {
        roomId: 1,
        examName: 1,
        courseName: 1,
        createdAt: 1
      }
    }).toArray();
    
    const attendanceStats = [];
    for (const room of allRooms) {
      // Get students from socket service (active) or from activity logs
      const socketRoom = rooms[room.roomId];
      const studentsAttended = socketRoom ? socketRoom.students.length : 0;
      
      // Get total flags for this room
      const flagsCount = await activityLogsCollection.countDocuments({ roomId: room.roomId });
      
      // Get unique flagged students
      const flaggedStudents = await activityLogsCollection.distinct("studentId", { roomId: room.roomId });
      
      attendanceStats.push({
        roomId: room.roomId,
        examName: room.examName || room.courseName || room.roomId,
        courseName: room.courseName || room.examName || room.roomId,
        studentsAttended,
        flagsCount,
        flaggedStudentsCount: flaggedStudents.length,
        createdAt: room.createdAt
      });
    }

    return attendanceStats;
  }

  /**
   * Get flags per exam statistics
   */
  static async getFlagsPerExam() {
    const { activityLogsCollection, roomsCollection } = getCollections();

    const flagsPerExam = await activityLogsCollection.aggregate([
      {
        $group: {
          _id: "$roomId",
          flagsCount: { $sum: 1 },
          flaggedStudents: { $addToSet: "$studentId" }
        }
      },
      {
        $project: {
          roomId: "$_id",
          flagsCount: 1,
          flaggedStudentsCount: { $size: "$flaggedStudents" },
          _id: 0
        }
      },
      { $sort: { flagsCount: -1 } },
      { $limit: 10 }
    ]).toArray();

    // Enrich with room details
    const enrichedStats = await Promise.all(
      flagsPerExam.map(async (stat) => {
        const room = await roomsCollection.findOne(
          { roomId: stat.roomId },
          { projection: { examName: 1, courseName: 1, createdAt: 1 } }
        );
        return {
          ...stat,
          examName: room?.examName || room?.courseName || stat.roomId,
          courseName: room?.courseName || room?.examName || stat.roomId,
          examDate: room?.createdAt
        };
      })
    );

    return enrichedStats;
  }

  /**
   * Get flagged students percentage
   */
  static async getFlaggedStudentsPercentage(roomId = null) {
    const { activityLogsCollection, studentsCollection } = getCollections();
    // Import rooms dynamically to avoid circular dependency
    const socketModule = await import("../services/socket.service.js");
    const rooms = socketModule.rooms;

    let query = {};
    if (roomId) {
      query.roomId = roomId;
    }

    // Get total students who attended exams
    const totalStudentsAttended = new Set();
    const allRooms = Object.keys(rooms);
    
    for (const rId of allRooms) {
      if (roomId && rId !== roomId) continue;
      const room = rooms[rId];
      if (room && room.students) {
        room.students.forEach(s => totalStudentsAttended.add(s.studentId));
      }
    }

    // Get flagged students
    const flaggedStudents = await activityLogsCollection.distinct("studentId", query);
    const flaggedCount = flaggedStudents.length;
    const totalAttended = totalStudentsAttended.size || 1; // Avoid division by zero

    const percentage = (flaggedCount / totalAttended) * 100;

    return {
      flaggedStudentsCount: flaggedCount,
      totalStudentsAttended: totalAttended,
      percentage: Math.round(percentage * 100) / 100
    };
  }

  /**
   * Get connected users count (examiners and students)
   */
  static async getConnectedUsersCount() {
    // Import rooms dynamically to avoid circular dependency
    const socketModule = await import("../services/socket.service.js");
    const rooms = socketModule.rooms;
    
    let totalExaminers = 0;
    let totalStudents = 0;
    const uniqueStudents = new Set();

    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.examiner) {
        totalExaminers++;
      }
      if (room.students) {
        room.students.forEach(s => uniqueStudents.add(s.studentId));
      }
    }

    totalStudents = uniqueStudents.size;

    return {
      connectedExaminers: totalExaminers,
      connectedStudents: totalStudents
    };
  }

  /**
   * Get monthly statistics
   */
  static async getMonthlyStats() {
    const { studentsCollection, examinersCollection, roomsCollection, activityLogsCollection } = getCollections();

    const now = new Date();
    const months = [];
    
    // Get last 12 months
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      
      const [studentsJoined, examinersJoined, roomsCreated, flagsGenerated] = await Promise.all([
        studentsCollection.countDocuments({
          createdAt: { $gte: monthStart, $lte: monthEnd }
        }),
        examinersCollection.countDocuments({
          createdAt: { $gte: monthStart, $lte: monthEnd }
        }),
        roomsCollection.countDocuments({
          createdAt: { $gte: monthStart, $lte: monthEnd }
        }),
        activityLogsCollection.countDocuments({
          timestamp: { $gte: monthStart, $lte: monthEnd }
        })
      ]);

      months.push({
        month: monthStart.toLocaleString('default', { month: 'short' }),
        year: monthStart.getFullYear(),
        studentsJoined,
        examinersJoined,
        roomsCreated,
        flagsGenerated
      });
    }

    return months;
  }

  /**
   * Get exam rooms opened by examiners
   */
  static async getExamRoomsByExaminer() {
    const { roomsCollection } = getCollections();

    // This assumes rooms have an examiner field, if not, we'll need to adjust
    const roomsByExaminer = await roomsCollection.aggregate([
      {
        $group: {
          _id: "$examinerId", // Adjust field name if different
          roomsCount: { $sum: 1 },
          rooms: { $push: { roomId: "$roomId", courseName: "$courseName", createdAt: "$createdAt" } }
        }
      },
      {
        $project: {
          examinerId: "$_id",
          roomsCount: 1,
          rooms: 1,
          _id: 0
        }
      },
      { $sort: { roomsCount: -1 } },
      { $limit: 10 }
    ]).toArray();

    return roomsByExaminer;
  }

  /**
   * Get institutions and organizations count
   */
  static async getInstitutionsCount() {
    const { studentsCollection, examinersCollection } = getCollections();

    // Assuming students/examiners have institution/organization field
    // Adjust field names based on your schema
    const [studentInstitutions, examinerOrganizations] = await Promise.all([
      studentsCollection.distinct("institution").catch(() => []),
      examinersCollection.distinct("organization").catch(() => [])
    ]);

    const allInstitutions = new Set([
      ...(studentInstitutions || []),
      ...(examinerOrganizations || [])
    ]);

    return {
      totalInstitutions: allInstitutions.size,
      institutions: Array.from(allInstitutions).slice(0, 10) // Top 10
    };
  }

  /**
   * Get impact metrics
   */
  static async getImpactMetrics() {
    const { roomsCollection, activityLogsCollection, studentsCollection, examinersCollection } = getCollections();

    const [
      totalExams,
      totalStudentsReached,
      totalFlagsPrevented,
      totalActiveExaminers
    ] = await Promise.all([
      roomsCollection.countDocuments(),
      studentsCollection.countDocuments(),
      activityLogsCollection.countDocuments(),
      examinersCollection.countDocuments()
    ]);

    // Calculate average students per exam
    const socketModule = await import("../services/socket.service.js");
    const rooms = socketModule.rooms;
    let totalStudentsInExams = 0;
    for (const roomId in rooms) {
      if (rooms[roomId].students) {
        totalStudentsInExams += rooms[roomId].students.length;
      }
    }
    const avgStudentsPerExam = totalExams > 0 ? (totalStudentsInExams / totalExams).toFixed(2) : 0;

    return {
      totalExams,
      totalStudentsReached,
      totalFlagsPrevented,
      totalActiveExaminers,
      avgStudentsPerExam: parseFloat(avgStudentsPerExam)
    };
  }

  /**
   * Get student-specific analytics
   */
  static async getStudentAnalytics(studentId) {
    const { activityLogsCollection, roomsCollection } = getCollections();
    const socketModule = await import("../services/socket.service.js");
    const rooms = socketModule.rooms;

    // Get all exams this student attended (from activity logs)
    const studentActivityLogs = await activityLogsCollection.find(
      { studentId },
      { projection: { roomId: 1, timestamp: 1, illegalUrl: 1 } }
    ).toArray();

    // Get unique room IDs the student attended
    const uniqueRooms = [...new Set(studentActivityLogs.map(log => log.roomId))];
    
    // Get room details
    const studentRooms = await Promise.all(
      uniqueRooms.map(async (roomId) => {
        const room = await roomsCollection.findOne(
          { roomId },
          { projection: { roomId: 1, examName: 1, courseName: 1, createdAt: 1, examSubject: 1, examinerName: 1 } }
        );
        return room;
      })
    );

    // Calculate statistics
    const totalExamsAttended = uniqueRooms.length;
    const totalFlagsReceived = studentActivityLogs.length;
    
    // Get flags per exam
    const flagsPerExam = {};
    studentActivityLogs.forEach(log => {
      if (!flagsPerExam[log.roomId]) {
        flagsPerExam[log.roomId] = 0;
      }
      flagsPerExam[log.roomId]++;
    });

    // Get monthly statistics for this student
    const now = new Date();
    const monthlyStats = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      
      const examsInMonth = studentActivityLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= monthStart && logDate <= monthEnd;
      }).length;

      const uniqueExamsInMonth = new Set(
        studentActivityLogs
          .filter(log => {
            const logDate = new Date(log.timestamp);
            return logDate >= monthStart && logDate <= monthEnd;
          })
          .map(log => log.roomId)
      ).size;

      monthlyStats.push({
        month: monthStart.toLocaleString('default', { month: 'short' }),
        year: monthStart.getFullYear(),
        examsAttended: uniqueExamsInMonth,
        flagsReceived: examsInMonth
      });
    }

    // Get recent exams (last 10)
    const recentExams = studentRooms
      .filter(room => room)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map(room => ({
        roomId: room.roomId,
        examName: room.examName || room.courseName || room.roomId,
        courseName: room.courseName || room.examName || room.roomId,
        examSubject: room.examSubject || null,
        examinerName: room.examinerName || null,
        flagsCount: flagsPerExam[room.roomId] || 0,
        examDate: room.createdAt
      }));

    // Check if student is currently in an exam
    let isCurrentlyInExam = false;
    let currentExamRoom = null;
    for (const roomId in rooms) {
      const room = rooms[roomId];
      if (room.students) {
        const studentInRoom = room.students.find(s => s.studentId === studentId);
        if (studentInRoom) {
          isCurrentlyInExam = true;
          const roomDetails = await roomsCollection.findOne(
            { roomId },
            { projection: { roomId: 1, courseName: 1 } }
          );
          currentExamRoom = roomDetails;
          break;
        }
      }
    }

    return {
      studentId,
      totalExamsAttended,
      totalFlagsReceived,
      flagsPerExam: Object.entries(flagsPerExam).map(([roomId, count]) => {
        const room = studentRooms.find(r => r && r.roomId === roomId);
        return {
          roomId,
          examName: room?.examName || room?.courseName || roomId,
          courseName: room?.courseName || room?.examName || roomId,
          flagsCount: count
        };
      }),
      monthlyStats,
      recentExams,
      isCurrentlyInExam,
      currentExamRoom
    };
  }
}

