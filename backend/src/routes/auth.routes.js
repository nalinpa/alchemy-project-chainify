import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
    res.json({ message: "Hello from auth routes" });
});

export default router;