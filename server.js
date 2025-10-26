import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import "dotenv/config";

import { connectDB } from "./config/db.js";
import { initializeSocket } from "./services/socket.service.js";

// Import routes (note the .js extension)
import authRoutes from "./routes/auth.routes.js";
import roomRoutes from "./routes/room.routes.js";

const app = express();
const port = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Socket.IO Setup ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust for production
    methods: ["GET", "POST"],
  },
});

// Initialize Socket.IO logic
initializeSocket(io);

// --- API Routes ---
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

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
      console.log(`Server (Express + Socket.IO) running on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to start server", err);
  }
}

startServer();