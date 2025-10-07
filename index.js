const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1a6g4ks.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

// socket connection
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust for production
    methods: ["GET", "POST"],
  },
});

let studentsCollection;
let examinersCollection;

async function run() {
  try {
    await client.connect();
    console.log("MongoDB connected");

    const db = client.db("code-guard");
    studentsCollection = db.collection("students");
    examinersCollection = db.collection("examiners");
    roomsCollection = db.collection("rooms")
  } catch (err) {
    console.error(err);
  }
}

run();

// ================= REGISTER =================
app.post("/register", async (req, res) => {
  try {
    const { role, password } = req.body;

    if (!role || !password)
      return res.status(400).send({ message: "Missing fields" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = { ...req.body, password: hashedPassword };

    if (role === "student") {
      const exists = await studentsCollection.findOne({
        studentId: userData.studentId,
      });
      if (exists)
        return res.send({ message: "Student already exists", inserted: false });

      const result = await studentsCollection.insertOne(userData);
      return res.send({
        message: "Student registered successfully",
        inserted: true,
        data: result,
      });
    } else if (role === "examiner") {
      const exists = await examinersCollection.findOne({
        username: userData.username,
      });
      if (exists)
        return res.send({
          message: "Examiner already exists",
          inserted: false,
        });

      const result = await examinersCollection.insertOne(userData);
      return res.send({
        message: "Examiner registered successfully",
        inserted: true,
        data: result,
      });
    } else {
      return res.status(400).send({ message: "Invalid role" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Server error" });
  }
});

// ================= LOGIN =================
app.post("/login", async (req, res) => {
  try {
    const { role, password } = req.body;
    let user;

    if (role === "student") {
      user = await studentsCollection.findOne({
        studentId: req.body.studentId,
      });
    } else if (role === "examiner") {
      user = await examinersCollection.findOne({
        username: req.body.username,
      });
    }

    if (!user) return res.status(400).send({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).send({ message: "Incorrect password" });

    res.send({
      message: "Login successful",
      user: {
        name: user.name,
        role: user.role,
        email: user.email,
        studentId: user.studentId,
        username: user.username,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Server error" });
  }
});
// login & register ends here

// mushfiq code
const saltRounds = 10;
let roomsCollection;
//New Room Creation and management route
//1 This is for the examiner whent he/she wants to create a new room
app.post("/rooms", async (req, res) => {
  try {
    if (!roomsCollection)
      return res.status(503).send({ message: "Database not ready." });

    const { roomId, password } = req.body;
    if (!roomId || !password) {
      return res
        .status(400)
        .send({ message: "Both roomId and password are required." });
    }

    const existingRoom = await roomsCollection.findOne({ roomId });
    if (existingRoom) {
      return res
        .status(409)
        .send({ message: "A room with this ID already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newRoom = {
      roomId: roomId,
      password: hashedPassword,
      createdAt: new Date(),
    };

    await roomsCollection.insertOne(newRoom);
    res
      .status(201)
      .send({ message: "Room created successfully", roomId: newRoom.roomId });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Server error while creating room" });
  }
});

//2 validation: for the students who wants to join

app.post("/rooms/validate", async (req, res) => {
  try {
    if (!roomsCollection)
      return res.status(503).send({ message: "Database not ready." });

    const { roomId, password } = req.body;
    if (!roomId || !password) {
      return res
        .status(400)
        .send({ message: "Both roomId and password are required." });
    }

    const room = await roomsCollection.findOne({ roomId });

    if (!room) {
      return res
        .status(404)
        .send({ success: false, message: "Room not found." });
    }

    const isMatch = await bcrypt.compare(password, room.password);

    if (isMatch) {
      res
        .status(200)
        .send({ success: true, message: "Credentials are valid." });
    } else {
      res.status(401).send({ success: false, message: "Invalid password." });
    }
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .send({ message: "Server error while validating credentials" });
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

// --- End of Socket.IO Signaling Logic ---

app.get("/", (req, res) => {
  res.send("Code Guard server is running");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});