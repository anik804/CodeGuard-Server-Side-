// models/examSummary.model.js
import { getCollections } from '../config/db.js';

const getExamSummaryCollection = () => {
  const { examSummariesCollection } = getCollections();
  if (!examSummariesCollection) {
    throw new Error("Exam summaries collection is not initialized.");
  }
  return examSummariesCollection;
};

export const createExamSummary = async (summaryData) => {
  return await getExamSummaryCollection().insertOne({
    ...summaryData,
    createdAt: new Date(),
  });
};

// existing helpers
export const getExaminerExamSummaries = async (examinerId, examinerUsername) => {
  const query = {};
  if (examinerId) query.examinerId = examinerId;
  if (examinerUsername) query.examinerUsername = examinerUsername;
  if (examinerId && examinerUsername) {
    query.$or = [{ examinerId }, { examinerUsername }];
    delete query.examinerId;
    delete query.examinerUsername;
  }

  return await getExamSummaryCollection()
    .find(query)
    .sort({ examEndedAt: -1 })
    .toArray();
};

export const getExamSummaryByRoomId = async (roomId) => {
  return await getExamSummaryCollection().findOne({ roomId });
};

// PAGINATED student summaries
export const getStudentExamSummariesPaginated = async (studentId, page = 1, limit = 6) => {
  const col = getExamSummaryCollection();
  const query = { 'students.studentId': studentId };

  const skip = (page - 1) * limit;
  const totalItems = await col.countDocuments(query);
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  const docs = await col
    .find(query)
    .sort({ examEndedAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();

  return {
    docs,
    pagination: {
      page,
      limit,
      totalPages,
      totalItems
    }
  };
};

// Also keep existing all-student function (if needed)
export const getStudentExamSummaries = async (studentId) => {
  return await getExamSummaryCollection()
    .find({ 'students.studentId': studentId })
    .sort({ examEndedAt: -1 })
    .toArray();
};

export const updateExamSummary = async (roomId, updates) => {
  return await getExamSummaryCollection().updateOne(
    { roomId },
    { $set: { ...updates, updatedAt: new Date() } }
  );
};


// import { getCollections } from '../config/db.js';

// const getExamSummaryCollection = () => {
//   const { examSummariesCollection } = getCollections();
//   if (!examSummariesCollection) {
//     throw new Error("Exam summaries collection is not initialized.");
//   }
//   return examSummariesCollection;
// };

// // Create exam summary when exam ends
// export const createExamSummary = async (summaryData) => {
//   return await getExamSummaryCollection().insertOne({
//     ...summaryData,
//     createdAt: new Date(),
//   });
// };

// // Get exam summaries for examiner
// export const getExaminerExamSummaries = async (examinerId, examinerUsername) => {
//   const query = {};
//   if (examinerId) query.examinerId = examinerId;
//   if (examinerUsername) query.examinerUsername = examinerUsername;
//   if (examinerId && examinerUsername) {
//     query.$or = [
//       { examinerId },
//       { examinerUsername }
//     ];
//     delete query.examinerId;
//     delete query.examinerUsername;
//   }

//   return await getExamSummaryCollection()
//     .find(query)
//     .sort({ examEndedAt: -1 })
//     .toArray();
// };

// // Get exam summary by roomId
// export const getExamSummaryByRoomId = async (roomId) => {
//   return await getExamSummaryCollection().findOne({ roomId });
// };

// // Get student's exam summaries (exams they participated in)
// export const getStudentExamSummaries = async (studentId) => {
//   return await getExamSummaryCollection()
//     .find({ 
//       'students.studentId': studentId 
//     })
//     .sort({ examEndedAt: -1 })
//     .toArray();
// };

// // Update exam summary
// export const updateExamSummary = async (roomId, updates) => {
//   return await getExamSummaryCollection().updateOne(
//     { roomId },
//     { $set: { ...updates, updatedAt: new Date() } }
//   );
// };

