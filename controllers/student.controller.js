import { findStudentById } from "../models/student.model.js";

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
