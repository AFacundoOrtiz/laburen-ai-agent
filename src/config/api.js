import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 3010;
export const API_URL = `http://localhost:${PORT}/api`;
