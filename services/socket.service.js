// Store room information in memory
export const rooms = {}; 

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
    socket.on("exam-end", ({ roomId }) => {
      if (rooms[roomId] && rooms[roomId].examiner === socket.id) {
        rooms[roomId].examStarted = false;
        
        // Notify all students
        io.to(roomId).emit("exam-ended");
        
        console.log(`Exam ended in room ${roomId}`);
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