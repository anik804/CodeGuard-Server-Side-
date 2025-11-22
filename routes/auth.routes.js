import express from "express";
import * as authController from "../controllers/auth.controller.js";

const router = express.Router();

// Note: OPTIONS requests are handled automatically by the CORS middleware in server.js
// No need for explicit OPTIONS handler here

router.post("/register", authController.register);
router.post("/login", authController.login);

export default router;