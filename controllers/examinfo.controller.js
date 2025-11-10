// import { getAllExamsFromRooms } from "../models/examModel.js";

import { getAllExams } from "../models/examinfo.model";

// export async function getAllExams(req, res) {
//   try {
//     const exams = await getAllExamsFromRooms();

//     // Temporary: score যুক্ত করা হচ্ছে যাতে frontend error না দেয়
//     const updatedExams = exams.map((exam) => ({
//       ...exam,
//       score: 90,
//     }));

//     res.status(200).json(updatedExams);
//   } catch (error) {
//     console.error("Error fetching exams:", error);
//     res.status(500).json({ message: "Failed to fetch exams" });
//   }
// }


export const getStudentExams = async (req, res) => {
  try {
    const studentId = req.params.studentId; // route params থেকে নিচ্ছি
    const exams = await getAllExams(studentId);

    // আপাতত score নাই, তাই 90 fix করে দিচ্ছি
    const formattedExams = exams.map(exam => ({
      id: exam._id,
      course: exam.courseName,
      examiner: exam.examinerName,
      date: exam.startTime,
      score: 90,
    }));

    res.status(200).json(formattedExams);
  } catch (error) {
    console.error("Error fetching student exams:", error);
    res.status(500).json({ message: "Server error while fetching exams" });
  }
};

