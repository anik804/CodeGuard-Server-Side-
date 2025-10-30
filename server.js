import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import "dotenv/config";

import { connectDB } from "./config/db.js";
import { initializeSocket } from "./services/socket.service.js";

// --- Import routes ---
import authRoutes from "./routes/auth.routes.js";
import roomRoutes from "./routes/room.routes.js";
import createProctoringRoutes from "./routes/proctoring.routes.js";
import studentRoutes from "./routes/student.routes.js"; 

const app = express();
const port = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: "10mb" })); // Increase JSON payload limit for Base64 screenshots
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// --- Socket.IO Setup ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // For dev — restrict in production
    methods: ["GET", "POST"],
  },
});

// --- Initialize Socket.IO logic ---
initializeSocket(io);

// --- API Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/students", studentRoutes); 

// Proctoring routes need the 'io' instance to send real-time alerts
const proctoringRoutes = createProctoringRoutes(io);
app.use("/api/proctoring", proctoringRoutes);

// --- Test Route ---
app.get("/", (req, res) => {
  res.send("Code Guard server is running");
});

// --- Start Server ---
async function startServer() {
  try {
    // Connect to the database *before* starting the server
    await connectDB();

    server.listen(port, () => {
      console.log(`🚀 Server (Express + Socket.IO) running on port ${port}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server", err);
  }
}

startServer();
