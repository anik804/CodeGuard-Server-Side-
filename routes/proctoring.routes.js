import express from "express";
import { getBlacklist, flagStudentActivity, getActivityLogs } from "../controllers/proctoring.controller.js";

// This factory function allows us to inject the 'io' instance
const createProctoringRoutes = (io) => {
  const router = express.Router();

  // Route for the extension to get the list of banned sites
  router.get("/blacklist", getBlacklist);
  
  // Route to get activity logs for a room
  router.get("/logs", getActivityLogs);
  
  // Route for the extension to post a new flag
  // We inject 'io' so the controller can send a socket event
  router.post("/flag", flagStudentActivity(io));

  return router;
};

export default createProctoringRoutes;