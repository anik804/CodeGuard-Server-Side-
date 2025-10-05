const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const bcrypt = require("bcrypt");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1a6g4ks.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

let studentsCollection;
let examinersCollection;

async function run() {
  try {
    await client.connect();
    console.log("MongoDB connected");

    const db = client.db("code-guard");
    studentsCollection = db.collection("students");
    examinersCollection = db.collection("examiners");
  } catch (err) {
    console.error(err);
  }
}

run();

// ================= REGISTER =================
app.post("/register", async (req, res) => {
  try {
    const { role, password } = req.body;

    if (!role || !password)
      return res.status(400).send({ message: "Missing fields" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = { ...req.body, password: hashedPassword };

    if (role === "student") {
      const exists = await studentsCollection.findOne({
        studentId: userData.studentId,
      });
      if (exists)
        return res.send({ message: "Student already exists", inserted: false });

      const result = await studentsCollection.insertOne(userData);
      return res.send({
        message: "Student registered successfully",
        inserted: true,
        data: result,
      });
    } else if (role === "examiner") {
      const exists = await examinersCollection.findOne({
        username: userData.username,
      });
      if (exists)
        return res.send({ message: "Examiner already exists", inserted: false });

      const result = await examinersCollection.insertOne(userData);
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
});

// ================= LOGIN =================
app.post("/login", async (req, res) => {
  try {
    const { role, password } = req.body;
    let user;

    if (role === "student") {
      user = await studentsCollection.findOne({
        studentId: req.body.studentId,
      });
    } else if (role === "examiner") {
      user = await examinersCollection.findOne({
        username: req.body.username,
      });
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
});

app.get("/", (req, res) => {
  res.send("Code Guard server is running");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
