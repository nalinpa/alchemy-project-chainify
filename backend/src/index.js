import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import { connectDB } from "./lib/db.js";
import { loggingMiddleware } from "./middleware/logging.middleware.js";
import { globalErrorHandler, ApiError } from './middleware/errorHandler.middleware.js';

import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import albumRoutes from "./routes/album.routes.js";
import songRoutes from "./routes/song.routes.js";

dotenv.config();

process.on('uncaughtException', (error, origin) => {
  console.error('!!!!!!!! SERVER CRASH - UNCAUGHT EXCEPTION !!!!!!!!');
  console.error('Origin:', origin);
  console.error('Error:', error);
  console.error('Stack:', error.stack);
  process.exit(1); 
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('!!!!!!!! SERVER CRASH - UNHANDLED REJECTION !!!!!!!!');
  console.error('Promise:', promise);
  console.error('Reason:', reason);
  process.exit(1);
});


const app = express();
const PORT = process.env.PORT || 5000;

app.use(loggingMiddleware);
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:3000" }));
app.use(express.json());

app.use("/api/user", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/album", albumRoutes);
app.use("/api/song", songRoutes);
app.use(globalErrorHandler);


app.listen(PORT, () => {
    console.log("Server is running on port " + PORT);
    connectDB();
});