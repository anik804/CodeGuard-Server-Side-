import { getCollections } from "../config/db.js";


const getStudentCollection = () => {
    const { studentsCollection } = getCollections();
    if (!studentsCollection) {
        throw new Error("Students collection is not initialized. Make sure connectDB() is called.");
    }
    return studentsCollection;
}

export const findStudentById = async (studentId) => {
  return await getStudentCollection().findOne({ studentId });
};

export const createStudent = async (userData) => {
  return await getStudentCollection().insertOne(userData);
};

export const updateStudentById = async (studentId, updateData) => {
  const result = await getStudentCollection().updateOne(
    { studentId },
    { $set: updateData } // $set দিয়ে update হবে
  );
  return result;
};
