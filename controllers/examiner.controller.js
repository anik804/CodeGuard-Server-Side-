// import { findExaminerByUsername, createExaminer } from "../models/examinerModel.js";
// import { getCollections } from "../config/db.js";
// import { findExaminerByUsername, updateExaminerByUsername } from "../models/examinerModel.js";

// const getExaminerCollection = () => {
//   const { examinersCollection } = getCollections();
//   if (!examinersCollection) {
//     throw new Error("Examiners collection not initialized.");
//   }
//   return examinersCollection;
// };

// // ✅ Get Examiner by Username
// export const getExaminer = async (req, res) => {
//   try {
//     const { username } = req.params;
//     const examiner = await findExaminerByUsername(username);

//     if (!examiner) {
//       return res.status(404).json({ message: "Examiner not found" });
//     }

//     res.status(200).json(examiner);
//   } catch (error) {
//     console.error("Error fetching examiner:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };




// // export const updateExaminer = async (req, res) => {
// //   try {
// //     const { username } = req.params;
// //     const { name, email, role } = req.body;

// //     const result = await updateExaminerByUsername(username, { name, email, role });

// //     if (result.modifiedCount === 0) {
// //       return res.status(404).json({ message: "Examiner not found or no changes made" });
// //     }

// //     res.status(200).json({ message: "Examiner updated successfully" });
// //   } catch (error) {
// //     console.error("Error updating examiner:", error);
// //     res.status(500).json({ message: "Server error" });
// //   }
// // };


// // import { getExaminerCollection } from "../models/examinerModel.js";
// // import bcrypt from "bcrypt";

// // // GET examiner by email
// // export const getExaminerByEmail = async (req, res) => {
// //   try {
// //     const { email } = req.params;
// //     if (!email) return res.status(400).send({ message: "Email is required" });

// //     const examiner = await getExaminerCollection().findOne({ email });
// //     if (!examiner) return res.status(404).send({ message: "Examiner not found" });

// //     // send only editable fields
// //     res.send({
// //       name: examiner.name,
// //       email: examiner.email,
// //       username: examiner.username,
// //       role: examiner.role,
// //     });
// //   } catch (err) {
// //     console.error(err);
// //     res.status(500).send({ message: "Server error" });
// //   }
// // };

// // // UPDATE examiner by email
// // export const updateExaminerByEmail = async (req, res) => {
// //   try {
// //     const { email } = req.params;
// //     const { name, role } = req.body;

// //     const result = await getExaminerCollection().updateOne(
// //       { email },
// //       { $set: { name, role } }
// //     );

// //     if (result.matchedCount === 0) return res.status(404).send({ message: "Examiner not found" });

// //     res.send({ message: "Profile updated successfully" });
// //   } catch (err) {
// //     console.error(err);
// //     res.status(500).send({ message: "Server error" });
// //   }
// // };


import { findExaminerByUsername, updateExaminerByUsername } from "../models/examinerModel.js";

// ✅ GET: Examiner by username
export const getExaminer = async (req, res) => {
  try {
    const { username } = req.params;
    const examiner = await findExaminerByUsername(username);

    if (!examiner) {
      return res.status(404).json({ message: "Examiner not found" });
    }

    res.status(200).json(examiner);
  } catch (error) {
    console.error("Error fetching examiner:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ PUT: Update examiner by username
export const updateExaminer = async (req, res) => {
  try {
    const { username } = req.params;
    const { name, email, role } = req.body;

    const result = await updateExaminerByUsername(username, { name, email, role });

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Examiner not found or no changes made" });
    }

    res.status(200).json({ message: "Examiner updated successfully" });
  } catch (error) {
    console.error("Error updating examiner:", error);
    res.status(500).json({ message: "Server error" });
  }
};
