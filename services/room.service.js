import bcrypt from "bcrypt";
import * as roomModel from "../models/room.model.js";

export class RoomService {
  static async createRoom(roomData) {
    const { roomId, password, ...otherData } = roomData;
    
    const existingRoom = await roomModel.findRoomById(roomId);
    if (existingRoom) {
      throw new Error("A room with this ID already exists.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newRoom = {
      roomId,
      password: hashedPassword,
      examName: otherData.examName || otherData.courseName || null,
      courseName: otherData.courseName || null,
      examDuration: otherData.examDuration ? parseInt(otherData.examDuration) : null,
      examDescription: otherData.examDescription || null,
      examSubject: otherData.examSubject || null,
      maxStudents: otherData.maxStudents ? parseInt(otherData.maxStudents) : null,
      proctoringLevel: otherData.proctoringLevel || null,
      startTime: otherData.startTime || null,
      examinerId: otherData.examinerId || null,
      examinerName: otherData.examinerName || null,
      examinerUsername: otherData.examinerUsername || null,
      createdAt: new Date(),
    };

    return await roomModel.createRoom(newRoom);
  }

  static async validateRoomCredentials(roomId, password) {
    const room = await roomModel.findRoomById(roomId);
    if (!room) {
      throw new Error("Room not found.");
    }

    const isMatch = await bcrypt.compare(password, room.password);
    if (!isMatch) {
      throw new Error("Invalid password.");
    }

    return true;
  }

  static async updateExamDetails(roomId, examDetails) {
    const room = await roomModel.findRoomById(roomId);
    if (!room) {
      throw new Error("Room not found.");
    }

    return await roomModel.updateRoomExamDetails(roomId, {
      courseName: examDetails.courseName,
      examDuration: examDetails.examDuration ? parseInt(examDetails.examDuration) : null,
    });
  }

  static async getExamDetails(roomId) {
    const room = await roomModel.getRoomWithExamDetails(roomId);
    if (!room) {
      throw new Error("Room not found.");
    }

    return room;
  }

  static async getRoomQuestion(roomId) {
    return await roomModel.getRoomQuestion(roomId);
  }

  static async updateRoomQuestion(roomId, publicId, fileName, resourceType) {
    return await roomModel.updateRoomQuestion(roomId, publicId, fileName, resourceType);
  }
}

