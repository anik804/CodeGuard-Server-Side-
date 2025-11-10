// import { getCollections } from "../config/db.js";

// export async function getAllExamsFromRooms() {
//   try {
//     const { roomsCollection } = getCollections();
//     const exams = await roomsCollection.find().toArray();
//     return exams;
//   } catch (error) {
//     console.error("Error fetching exams:", error);
//     throw error;
//   }
// }

import { getCollections } from "../config/db.js";

export const getAllExams = async (studentId) => {
  const { roomsCollection } = getCollections();

  const exams = await roomsCollection.find({ "students.id": studentId }).toArray();
  
  return exams;
};
