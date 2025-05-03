import express from "express";
import dotenv from "dotenv";

import adminRoutes from "./routes/admin.routes.js";
import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import albumRoutes from "./routes/album.routes.js";
import songRoutes from "./routes/song.routes.js";
import statsRoutes from "./routes/stats.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/album", albumRoutes);
app.use("/api/song", songRoutes);
app.use("/api/stats", statsRoutes);

app.listen(PORT, () => {
    console.log("Server is running on port " + PORT);
});