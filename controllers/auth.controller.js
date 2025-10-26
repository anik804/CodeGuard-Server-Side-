import bcrypt from "bcrypt";
import * as studentModel from "../models/student.model.js";
import * as examinerModel from "../models/examiner.model.js";

export const register = async (req, res) => {
  try {
    const { role, password } = req.body;

    if (!role || !password)
      return res.status(400).send({ message: "Missing fields" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = { ...req.body, password: hashedPassword };

    if (role === "student") {
      const exists = await studentModel.findStudentById(userData.studentId);
      if (exists)
        return res.send({ message: "Student already exists", inserted: false });

      const result = await studentModel.createStudent(userData);
      return res.send({
        message: "Student registered successfully",
        inserted: true,
        data: result,
      });

    } else if (role === "examiner") {
      const exists = await examinerModel.findExaminerByUsername(userData.username);
      if (exists)
        return res.send({
          message: "Examiner already exists",
          inserted: false,
        });

      const result = await examinerModel.createExaminer(userData);
      return res.send({
        message: "Examiner registered successfully",
        inserted: true,
        data: result,
      });
      
    } else {
      return res.status(400).send({ message: "Invalid role" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { role, password } = req.body;
    let user;

    if (role === "student") {
      user = await studentModel.findStudentById(req.body.studentId);
    } else if (role === "examiner") {
      user = await examinerModel.findExaminerByUsername(req.body.username);
    }

    if (!user) return res.status(400).send({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).send({ message: "Incorrect password" });

    res.send({
      message: "Login successful",
      user: {
        name: user.name,
        role: user.role,
        email: user.email,
        studentId: user.studentId,
        username: user.username,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Server error" });
  }
};