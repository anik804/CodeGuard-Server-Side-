import express from "express";
import * as roomController from "../controllers/room.controller.js";

const router = express.Router();

router.post("/", roomController.createNewRoom);
router.post("/validate", roomController.validateRoomCredentials);

export default router;