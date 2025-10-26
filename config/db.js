import "dotenv/config"; 
import { MongoClient } from "mongodb";

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1a6g4ks.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri);

let db;
let studentsCollection;
let examinersCollection;
let roomsCollection;

export async function connectDB() {
  try {
    await client.connect();
    console.log("MongoDB connected");
    
    db = client.db("code-guard");
    studentsCollection = db.collection("students");
    examinersCollection = db.collection("examiners");
    roomsCollection = db.collection("rooms");

    return { studentsCollection, examinersCollection, roomsCollection, db };
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1); // Exit process with failure
  }
}

export function getCollections() {
  return { studentsCollection, examinersCollection, roomsCollection, db };
}