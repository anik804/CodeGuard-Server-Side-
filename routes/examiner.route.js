// import express from "express";
// import { getExaminer, updateExaminer } from "../controllers/examinerController.js";
// const router = express.Router();

// router.get("/api/:username", getExaminer);
// router.put("/api/:username", updateExaminer);

// export default router;

import express from "express";
import { getExaminer, updateExaminer } from "../controllers/examinerController.js";

const router = express.Router();

// examiner info fetch + update
router.get("/:username", getExaminer);
router.put("/:username", updateExaminer);

export default router;



// import express from "express";
// import { getExaminerByEmail, updateExaminerByEmail } from "../controllers/examinerController.js";

// const router = express.Router();

// // fetch examiner
// router.get("/:email", getExaminerByEmail);

// // update examiner
// router.put("/:email", updateExaminerByEmail);

// export default router;
