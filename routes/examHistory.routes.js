import express from 'express';
import * as examHistoryController from '../controllers/examHistory.controller.js';

const router = express.Router();

// Test route to verify the router is working
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'Exam history routes are working!' });
});

router.get('/examiner', examHistoryController.getExaminerExamHistory);
router.get('/student', examHistoryController.getStudentExamHistory);
router.get('/:roomId', examHistoryController.getExamSummaryDetails);

export default router;

