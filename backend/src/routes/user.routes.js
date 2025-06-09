import { Router } from "express";
import multer from "multer";

import { becomeMusician, checkMusician, getMusicianProfileData } from "../controllers/user.controller.js";
import { authenticateToken, protectRouteUser, protectRouteMusician } from "../middleware/auth.middleware.js";

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post("/musician/add", upload.single("image"), authenticateToken, protectRouteUser, becomeMusician);
router.post("/musician/check", authenticateToken, checkMusician);
router.get('/musician/profile', authenticateToken, protectRouteMusician, getMusicianProfileData);

export default router;