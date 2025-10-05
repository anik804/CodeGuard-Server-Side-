const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1a6g4ks.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

let usersCollection;

async function run() {
  try {
    await client.connect();
    console.log("MongoDB connected");

    usersCollection = client.db("code-guard").collection("users");
  } catch (err) {
    console.error(err);
  }
}

run();

// Routes
app.post("/users", async (req, res) => {
  try {
    const { email } = req.body;
    const exists = await usersCollection.findOne({ email });
    if (exists) return res.send({ message: "User exists", inserted: false });

    const result = await usersCollection.insertOne(req.body);
    res.send({ message: "User added", inserted: true, data: result });
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
