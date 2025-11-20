// Store room information in memory
export const rooms = {};

// Import exam summary model (dynamic import to avoid circular dependency)
let examSummaryModel = null;
let getCollections = null; 

export const initializeSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // When an examiner creates/joins a room
    socket.on("examiner-join-room", ({ roomId }) => {
      socket.join(roomId);
      if (!rooms[roomId]) {
        rooms[roomId] = {
          examiner: socket.id,
          students: [],
          examStarted: false,
          questionUrl: null
        };
      } else {
        rooms[roomId].examiner = socket.id;
      }
      console.log(`Examiner ${socket.id} joined room ${roomId}`);
      
      // Send current student list to examiner
      const studentList = rooms[roomId].students.map(s => ({
        socketId: s.socketId,
        studentId: s.studentId,
        name: s.name,
        joinedAt: s.joinedAt
      }));
      socket.emit("current-students", studentList);
    });

    // When a student joins a room
    socket.on("student-join-room", ({ roomId, studentId, studentName }) => {
      if (rooms[roomId]) {
        socket.join(roomId);
        
        const studentInfo = {
          socketId: socket.id,
          studentId: studentId || socket.id,
          name: studentName || "Student",
          joinedAt: new Date()
        };
        
        rooms[roomId].students.push(studentInfo);
        
        // Notify the examiner with student info
        const examinerSocketId = rooms[roomId].examiner;
        if (examinerSocketId) {
          io.to(examinerSocketId).emit("student-joined", studentInfo);
        }
        
        // If exam already started and question exists, send it to new student
        if (rooms[roomId].examStarted && rooms[roomId].questionUrl) {
          socket.emit("exam-started", { 
            questionUrl: rooms[roomId].questionUrl 
          });
        }
        
        console.log(`Student ${studentInfo.name} (${studentInfo.studentId}) joined room ${roomId}`);
      } else {
        socket.emit("room-not-found", "The exam room ID is invalid.");
      }
    });

    // Handle exam start event
    socket.on("exam-start", ({ roomId }) => {
      // Check if room exists and user is the examiner
      if (rooms[roomId]) {
        // Allow if examiner matches OR if no examiner check (for flexibility)
        if (!rooms[roomId].examiner || rooms[roomId].examiner === socket.id) {
          rooms[roomId].examStarted = true;
          
          // Always use roomId for question URL (MongoDB based)
          rooms[roomId].questionUrl = roomId; // Store roomId as identifier
          
          // Broadcast exam start to all students in the room
          io.to(roomId).emit("exam-started", { 
            questionUrl: roomId // Send roomId, students will use it to fetch PDF
          });
          
          console.log(`✅ Exam started in room ${roomId}`);
        } else {
          console.warn(`⚠️ Unauthorized exam start attempt in room ${roomId}`);
        }
      } else {
        console.warn(`⚠️ Room ${roomId} not found for exam start`);
      }
    });

    // Handle exam end event
    socket.on("exam-end", async ({ roomId }) => {
      if (rooms[roomId] && rooms[roomId].examiner === socket.id) {
        rooms[roomId].examStarted = false;
        
        // ✅ SAVE EXAM SUMMARY TO DATABASE
        try {
          // Dynamic import to avoid circular dependency
          if (!examSummaryModel) {
            examSummaryModel = await import('../models/examSummary.model.js');
          }
          if (!getCollections) {
            const dbModule = await import('../config/db.js');
            getCollections = dbModule.getCollections;
          }

          const room = rooms[roomId];
          const students = room.students || [];
          
          // Get room details from database
          const { roomsCollection, activityLogsCollection, studentSubmissionsCollection } = getCollections();
          const roomDetails = await roomsCollection.findOne({ roomId });
          
          // Get flagged students count
          const flaggedCount = await activityLogsCollection.countDocuments({ roomId });
          
          // Get submissions count
          const submissionsCount = await studentSubmissionsCollection.countDocuments({ roomId });
          
          // Get unique students who submitted
          const studentsWithSubmissions = await studentSubmissionsCollection.distinct('studentId', { roomId });
          
          // Check if summary already exists (avoid duplicates)
          const existingSummary = await examSummaryModel.getExamSummaryByRoomId(roomId);
          if (!existingSummary) {
            // Create exam summary
            const examSummary = {
              roomId,
              examName: roomDetails?.examName || roomDetails?.courseName || roomId,
              courseName: roomDetails?.courseName || null,
              examinerId: roomDetails?.examinerId || null,
              examinerUsername: roomDetails?.examinerUsername || null,
              examinerName: roomDetails?.examinerName || null,
              examStartedAt: roomDetails?.examStartedAt || roomDetails?.startTime || null,
              examEndedAt: new Date(),
              examDuration: roomDetails?.examDuration || null, // in minutes
              totalStudentsJoined: students.length,
              students: students.map(s => ({
                studentId: s.studentId,
                studentName: s.name,
                joinedAt: s.joinedAt,
              })),
              flaggedStudentsCount: flaggedCount,
              submissionsCount: submissionsCount,
              studentsWithSubmissions: studentsWithSubmissions.length,
              status: 'completed',
            };
            
            // Save to database
            await examSummaryModel.createExamSummary(examSummary);
            console.log(`✅ Exam summary saved for room ${roomId} with ${students.length} students`);
          } else {
            console.log(`ℹ️ Exam summary already exists for room ${roomId}, skipping duplicate`);
          }
        } catch (error) {
          console.error('❌ Error saving exam summary:', error);
          // Don't block exam end if summary save fails
        }
        
        // Notify all students to disconnect and stop screen sharing
        io.to(roomId).emit("exam-ended", { 
          message: "Exam has ended. Please disconnect.",
          disconnect: true 
        });
        
        // Disconnect all students in the room
        const students = rooms[roomId].students || [];
        students.forEach((student) => {
          io.to(student.socketId).emit("force-disconnect");
          io.sockets.sockets.get(student.socketId)?.disconnect();
        });
        
        console.log(`Exam ended in room ${roomId}, all students disconnected`);
      }
    });

    // Handle question uploaded after exam start
    socket.on("question-uploaded", ({ roomId }) => {
      if (rooms[roomId] && rooms[roomId].examiner === socket.id) {
        // If exam is already started, send question to all students immediately
        if (rooms[roomId].examStarted) {
          io.to(roomId).emit("exam-started", { 
            questionUrl: roomId // Send roomId, students will use it to fetch PDF
          });
          console.log(`📚 Question uploaded and sent to all students in room ${roomId}`);
        }
      }
    });

    // Handle when student starts screen sharing
    socket.on("student-started-sharing", ({ roomId, studentId, socketId }) => {
      if (rooms[roomId]) {
        console.log(`📹 Student ${studentId} (${socketId || socket.id}) started screen sharing in room ${roomId}`);
        
        // Notify examiner that student started sharing
        const examinerSocketId = rooms[roomId].examiner;
        if (examinerSocketId) {
          io.to(examinerSocketId).emit("student-started-sharing", {
            studentId,
            socketId: socketId || socket.id
          });
        }
      }
    });

    // Generic signaling event for relaying WebRTC signals
    socket.on("send-signal", (payload) => {
      io.to(payload.to).emit("receive-signal", {
        signal: payload.signal,
        from: socket.id,
      });
    });

    // Handle student leave request
    socket.on("student-request-leave", ({ roomId, studentId, studentName, reason }) => {
      if (rooms[roomId]) {
        const examinerSocketId = rooms[roomId].examiner;
        if (examinerSocketId) {
          io.to(examinerSocketId).emit("student-leave-request", {
            studentId,
            studentName: studentName || "Student",
            socketId: socket.id,
            reason: reason || "No reason provided",
            timestamp: new Date()
          });
          console.log(`📤 Student ${studentId} requested to leave room ${roomId}`);
        }
      }
    });

    // Handle examiner response to leave request
    socket.on("examiner-respond-leave", ({ roomId, studentSocketId, approved }) => {
      if (rooms[roomId] && rooms[roomId].examiner === socket.id) {
        if (approved) {
          // Notify student they can leave
          io.to(studentSocketId).emit("leave-request-approved", {
            message: "Your leave request has been approved. You may now exit the exam."
          });
          console.log(`✅ Examiner approved leave request for student ${studentSocketId}`);
        } else {
          // Notify student request denied
          io.to(studentSocketId).emit("leave-request-denied", {
            message: "Your leave request has been denied. Please continue with the exam."
          });
          console.log(`❌ Examiner denied leave request for student ${studentSocketId}`);
        }
      }
    });

    // Handle examiner kick student
    socket.on("examiner-kick-student", ({ roomId, studentSocketId, reason }) => {
      console.log(`🚫 Kick request received for student ${studentSocketId} in room ${roomId}`);
      
      if (rooms[roomId] && rooms[roomId].examiner === socket.id) {
        // Find student info before removing - try multiple matching strategies
        let studentIndex = rooms[roomId].students.findIndex(s => s.socketId === studentSocketId);
        let studentInfo = null;
        
        // If not found by socketId, try by studentId (in case socketId passed is actually studentId)
        if (studentIndex === -1) {
          studentIndex = rooms[roomId].students.findIndex(s => 
            s.studentId === studentSocketId || 
            String(s.studentId) === String(studentSocketId)
          );
        }
        
        if (studentIndex > -1) {
          studentInfo = rooms[roomId].students[studentIndex];
          const actualSocketId = studentInfo.socketId || studentSocketId;
          
          console.log(`✅ Found student to kick: ${studentInfo.name} (${studentInfo.studentId}) with socketId: ${actualSocketId}`);
          
          // Notify student they've been kicked
          io.to(actualSocketId).emit("student-kicked", {
            message: reason || "You have been removed from the exam by the examiner.",
            reason: reason || "Removed by examiner"
          });
          
          // Force disconnect the student
          io.to(actualSocketId).emit("force-disconnect");
          const studentSocket = io.sockets.sockets.get(actualSocketId);
          if (studentSocket) {
            studentSocket.disconnect();
            console.log(`✅ Disconnected student socket: ${actualSocketId}`);
          } else {
            console.warn(`⚠️ Student socket ${actualSocketId} not found in active sockets`);
          }

          // Remove from room
          rooms[roomId].students.splice(studentIndex, 1);
          console.log(`🚫 Removed student ${studentInfo.name} (${studentInfo.studentId}) from room ${roomId}. Remaining: ${rooms[roomId].students.length}`);
          
          // Notify examiner that student was removed (so UI updates)
          const examinerSocketId = rooms[roomId].examiner;
          console.log(`📤 Notifying examiner ${examinerSocketId} about removed student`);
          io.to(examinerSocketId).emit("student-removed", {
            socketId: actualSocketId,
            studentId: studentInfo.studentId,
            studentName: studentInfo.name
          });
          
          // Also broadcast updated student list to examiner
          io.to(examinerSocketId).emit("current-students", rooms[roomId].students);
          console.log(`📤 Updated student list sent to examiner. Count: ${rooms[roomId].students.length}`);
        } else {
          console.warn(`⚠️ Student with socketId ${studentSocketId} not found in room ${roomId}`);
          console.warn(`⚠️ Available students in room:`, rooms[roomId].students.map(s => ({ 
            socketId: s.socketId, 
            studentId: s.studentId, 
            name: s.name 
          })));
        }
      } else {
        console.warn(`⚠️ Kick request denied: Room ${roomId} not found or socket ${socket.id} is not the examiner`);
        console.warn(`⚠️ Examiner for room: ${rooms[roomId]?.examiner}, Current socket: ${socket.id}`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      // Find which room the socket was in and notify others
      for (const roomId in rooms) {
        if (rooms[roomId].examiner === socket.id) {
          // Examiner disconnected - notify students
          io.to(roomId).emit("examiner-left");
          delete rooms[roomId];
          console.log(`Examiner for room ${roomId} disconnected. Room closed.`);
          break;
        }

        const studentIndex = rooms[roomId].students.findIndex(s => s.socketId === socket.id);
        if (studentIndex > -1) {
          const studentInfo = rooms[roomId].students[studentIndex];
          rooms[roomId].students.splice(studentIndex, 1);
          const examinerSocketId = rooms[roomId].examiner;
          if (examinerSocketId) {
            io.to(examinerSocketId).emit("student-left", studentInfo);
          }
          console.log(`Student ${studentInfo.name} (${studentInfo.studentId}) left room ${roomId}`);
          break;
        }
      }
    });
  });
};