import bcrypt from "bcrypt";
import * as roomModel from "../models/room.model.js";
const saltRounds = 10;

export const createNewRoom = async (req, res) => {
  try {
    const { roomId, password } = req.body;
    if (!roomId || !password) {
      return res
        .status(400)
        .send({ message: "Both roomId and password are required." });
    }

    const existingRoom = await roomModel.findRoomById(roomId);
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

    await roomModel.createRoom(newRoom);
    res
      .status(201)
      .send({ message: "Room created successfully", roomId: newRoom.roomId });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Server error while creating room" });
  }
};

export const validateRoomCredentials = async (req, res) => {
  try {
    const { roomId, password } = req.body;
    if (!roomId || !password) {
      return res
        .status(400)
        .send({ message: "Both roomId and password are required." });
    }

    const room = await roomModel.findRoomById(roomId);

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
};