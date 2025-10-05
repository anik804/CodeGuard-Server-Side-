const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const app = express();

// Middleware for Express API routes
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust for production
    methods: ["GET", "POST"],
  },
});

// --- MongoDB Connection Setup ---
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1a6g4ks.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);
let usersCollection;

async function run() {
  try {
    await client.connect();
    console.log("MongoDB connected");
    usersCollection = client.db("code-guard").collection("users");
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
  }
}
run();

// --- API Routes ---
app.get("/", (req, res) => {
  res.send("Code Guard server is running");
});

app.post("/users", async (req, res) => {
  try {
    const { email } = req.body;
    // Ensure collection is available before querying
    if (!usersCollection) {
        return res.status(503).send({ message: "Database not ready, please try again later." });
    }
    const exists = await usersCollection.findOne({ email });
    if (exists) {
        return res.send({ message: "User exists", inserted: false });
    }

    const result = await usersCollection.insertOne(req.body);
    res.send({ message: "User added", inserted: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Server error" });
  }
});

// --- Socket.IO Signaling Logic ---
const rooms = {}; // Store room information

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
      // Notify the examiner that a new student has joined
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
        // Examiner disconnected, logic to handle this could be added
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server with API and Signaling running on port ${PORT}`));