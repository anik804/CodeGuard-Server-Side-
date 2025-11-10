// import { getCollections } from "../config/db.js";


// const getExaminerCollection = () => {
//     const { examinersCollection } = getCollections();
//     if (!examinersCollection) {
//         throw new Error("Examiners collection is not initialized.");
//     }
//     return examinersCollection;
// }

// export const findExaminerByUsername = async (username) => {
//   return await getExaminerCollection().findOne({ username });
// };

// export const createExaminer = async (userData) => {
//   return await getExaminerCollection().insertOne(userData);
// };


// import { getCollections } from "../config/db.js";

// const getExaminerCollection = () => {
//   const { examinersCollection } = getCollections();
//   if (!examinersCollection) {
//     throw new Error("Examiners collection is not initialized.");
//   }
//   return examinersCollection;
// };

// export const findExaminerByUsername = async (username) => {
//   return await getExaminerCollection().findOne({ username });
// };

// export const createExaminer = async (userData) => {
//   return await getExaminerCollection().insertOne(userData);
// };

// // ✅ NEW (optional): Update Examiner by username
// export const updateExaminerByUsername = async (username, updateData) => {
//   const examinerCollection = getExaminerCollection();
//   return await examinerCollection.updateOne(
//     { username },
//     { $set: updateData }
//   );
// };


import { getCollections } from "../config/db.js";

const getExaminerCollection = () => {
  const { examinersCollection } = getCollections();
  if (!examinersCollection) {
    throw new Error("Examiners collection is not initialized.");
  }
  return examinersCollection;
};

// ✅ Find examiner by username
export const findExaminerByUsername = async (username) => {
  return await getExaminerCollection().findOne({ username });
};

// ✅ Create new examiner
export const createExaminer = async (userData) => {
  return await getExaminerCollection().insertOne(userData);
};

// ✅ Update examiner by username
export const updateExaminerByUsername = async (username, updateData) => {
  return await getExaminerCollection().updateOne({ username }, { $set: updateData });
};
