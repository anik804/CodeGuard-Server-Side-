// Store room information in memory
const rooms = {}; 

export const initializeSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // When an examiner creates/joins a room
    socket.on("examiner-join-room", ({ roomId }) => {
      socket.join(roomId);
      rooms[roomId] = {
        examiner: socket.id,
        students: [],
      };
      console.log(`Examiner ${socket.id} created room ${roomId}`);
    });

    // When a student joins a room
    socket.on("student-join-room", (roomId) => {
      if (rooms[roomId]) {
        socket.join(roomId);
        rooms[roomId].students.push(socket.id);
        
        // Notify the examiner
        const examinerSocketId = rooms[roomId].examiner;
        io.to(examinerSocketId).emit("student-joined", { studentId: socket.id });
        console.log(`Student ${socket.id} joined room ${roomId}`);
      } else {
        socket.emit("room-not-found", "The exam room ID is invalid.");
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
          delete rooms[roomId];
          console.log(`Examiner for room ${roomId} disconnected. Room closed.`);
          break;
        }

        const studentIndex = rooms[roomId].students.indexOf(socket.id);
        if (studentIndex > -1) {
          rooms[roomId].students.splice(studentIndex, 1);
          const examinerSocketId = rooms[roomId].examiner;
          io.to(examinerSocketId).emit("student-left", socket.id);
          console.log(`Student ${socket.id} left room ${roomId}`);
          break;
        }
      }
    });
  });
};