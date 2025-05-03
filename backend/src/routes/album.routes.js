import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
    res.json({ message: "Hello from album routes" });
});

export default router;