import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import "dotenv/config";

import { connectDB } from "./config/db.js";
import { initializeSocket } from "./services/socket.service.js";
import { analyticsCache } from "./services/analyticsCache.service.js";
import { clientConfig } from "./config/client.config.js";

// --- Import routes ---
import authRoutes from "./routes/auth.routes.js";
import roomRoutes from "./routes/room.routes.js";
import createProctoringRoutes from "./routes/proctoring.routes.js";
import studentRoutes from "./routes/student.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import studentAnalyticsRoutes from "./routes/studentAnalytics.routes.js";
import studentSubmissionRoutes from "./routes/studentSubmission.routes.js";
import examHistoryRoutes from "./routes/examHistory.routes.js";
// import examinerRoutes from "./routes/examiner.route.js";

const app = express();
const port = process.env.PORT || 3000;


// --- Middleware ---
// CORS configuration - using centralized client config
const allowedOrigins = clientConfig.allowedOrigins;

// Log allowed origins for debugging
console.log('🔒 CORS Allowed Origins:', allowedOrigins);

// Configure CORS with explicit origin matching
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list (case-insensitive, without trailing slash)
    const normalizedOrigin = origin.replace(/\/$/, '');
    const isAllowed = allowedOrigins.some(allowed => {
      const normalizedAllowed = allowed.replace(/\/$/, '');
      return normalizedOrigin === normalizedAllowed || 
             normalizedOrigin.toLowerCase() === normalizedAllowed.toLowerCase();
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS: Blocked request from origin: ${origin}`);
      console.warn(`   Allowed origins:`, allowedOrigins);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
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
// app.use("/api/examiners", examinerRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/analytics/student", studentAnalyticsRoutes);
app.use("/api/submissions", studentSubmissionRoutes);
app.use("/api/exam-history", examHistoryRoutes);
console.log("✅ Exam history routes registered at /api/exam-history");

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

    // Preload analytics cache
    await analyticsCache.preloadAnalytics();

    // Start background refresh for analytics (every 1 minute)
    analyticsCache.startBackgroundRefresh(60000);

    server.listen(port, () => {
      console.log(`🚀 Server (Express + Socket.IO) running on port ${port}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server", err);
  }
}

startServer();
