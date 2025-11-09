import express from "express";
import * as submissionController from "../controllers/studentSubmission.controller.js";

const router = express.Router();

router.post(
  "/:roomId/submit",
  submissionController.upload.single("submission"),
  submissionController.uploadStudentSubmission
);
router.get("/:roomId/submissions", submissionController.getRoomSubmissions);
router.get("/submission/:submissionId/download", submissionController.getSubmissionDownloadUrl);
router.put("/submission/:submissionId/grade", submissionController.updateSubmissionGrade);

export default router;

