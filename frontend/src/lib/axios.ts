import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3001";
console.log("Creating axiosInstance with baseURL:", baseURL);

export const axiosInstance = axios.create({
  baseURL,
});