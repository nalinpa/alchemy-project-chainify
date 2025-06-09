import mongoose from "mongoose";

export const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.error("FATAL ERROR: MONGO_URI is not defined in the environment variables.");
    process.exit(1);
  }

  try {
    mongoose.set('strictQuery', true);
    
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } 
  catch (error) {
    console.log("Failed to connect to DB", error);
    process.exit(1);
  }
};