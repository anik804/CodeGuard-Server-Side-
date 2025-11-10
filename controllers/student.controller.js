// import { findStudentById } from "../models/student.model.js";
import { updateStudentById, findStudentById } from "../models/student.model.js";

export const getStudentById = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({ message: "studentId is required" });
    }

    const student = await findStudentById(studentId);

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // You might want to hide sensitive info (like password)
    const { password, ...safeData } = student;

    res.status(200).json(safeData);
  } catch (error) {
    console.error("Error fetching student:", error);
    res.status(500).json({ message: "Server error" });
  }
};



export const updateStudentProfile = async (req, res) => {
  try {
    const { studentId } = req.params;
    const updateData = req.body;

    if (!studentId) {
      return res.status(400).json({ message: "studentId is required" });
    }

    // Check if student exists
    const existingStudent = await findStudentById(studentId);
    if (!existingStudent) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Update student
    await updateStudentById(studentId, updateData);

    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating student profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};
