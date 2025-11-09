import { AuthService } from "../services/auth.service.js";

export const register = async (req, res) => {
  try {
    const { role, password } = req.body;

    if (!role || !password) {
      return res.status(400).send({ message: "Missing fields" });
    }

    const userData = { ...req.body };

    if (role === "student") {
      try {
        const result = await AuthService.registerStudent(userData);
        return res.send({
          message: "Student registered successfully",
          inserted: true,
          data: result,
        });
      } catch (error) {
        if (error.message === "Student already exists") {
          return res.send({ message: "Student already exists", inserted: false });
        }
        throw error;
      }
    } else if (role === "examiner") {
      try {
        const result = await AuthService.registerExaminer(userData);
        return res.send({
          message: "Examiner registered successfully",
          inserted: true,
          data: result,
        });
      } catch (error) {
        if (error.message === "Examiner already exists") {
          return res.send({ message: "Examiner already exists", inserted: false });
        }
        throw error;
      }
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
      user = await AuthService.loginStudent(req.body.studentId, password);
    } else if (role === "examiner") {
      user = await AuthService.loginExaminer(req.body.username, password);
    } else {
      return res.status(400).send({ message: "Invalid role" });
    }

    res.send({
      message: "Login successful",
      user,
    });
  } catch (err) {
    console.error(err);
    if (err.message === "User not found" || err.message === "Incorrect password") {
      return res.status(400).send({ message: err.message });
    }
    res.status(500).send({ message: "Server error" });
  }
};