import express from "express";
import { 
  getBlacklist, 
  flagStudentActivity, 
  getActivityLogs,
  getBlockedWebsites,
  addBlockedWebsite,
  removeBlockedWebsite
} from "../controllers/proctoring.controller.js";

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

  // Blocked websites management
  router.get("/blocked-websites/:roomId", getBlockedWebsites);
  router.post("/blocked-websites/:roomId", addBlockedWebsite);
  router.delete("/blocked-websites/:roomId", removeBlockedWebsite);

  return router;
};

export default createProctoringRoutes;