import { getCollections } from "../config/db.js";


const getExaminerCollection = () => {
    const { examinersCollection } = getCollections();
    if (!examinersCollection) {
        throw new Error("Examiners collection is not initialized.");
    }
    return examinersCollection;
}

export const findExaminerByUsername = async (username) => {
  return await getExaminerCollection().findOne({ username });
};

export const createExaminer = async (userData) => {
  return await getExaminerCollection().insertOne(userData);
};

