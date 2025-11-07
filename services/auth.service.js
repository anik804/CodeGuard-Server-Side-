import bcrypt from "bcrypt";
import * as studentModel from "../models/student.model.js";
import * as examinerModel from "../models/examiner.model.js";

export class AuthService {
  static async registerStudent(userData) {
    const exists = await studentModel.findStudentById(userData.studentId);
    if (exists) {
      throw new Error("Student already exists");
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const newUserData = { ...userData, password: hashedPassword };
    
    return await studentModel.createStudent(newUserData);
  }

  static async registerExaminer(userData) {
    const exists = await examinerModel.findExaminerByUsername(userData.username);
    if (exists) {
      throw new Error("Examiner already exists");
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const newUserData = { ...userData, password: hashedPassword };
    
    return await examinerModel.createExaminer(newUserData);
  }

  static async loginStudent(studentId, password) {
    const user = await studentModel.findStudentById(studentId);
    if (!user) {
      throw new Error("User not found");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error("Incorrect password");
    }

    return {
      name: user.name,
      role: user.role,
      email: user.email,
      studentId: user.studentId,
      username: user.username,
    };
  }

  static async loginExaminer(username, password) {
    const user = await examinerModel.findExaminerByUsername(username);
    if (!user) {
      throw new Error("User not found");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error("Incorrect password");
    }

    return {
      name: user.name,
      role: user.role,
      email: user.email,
      studentId: user.studentId,
      username: user.username,
    };
  }
}

