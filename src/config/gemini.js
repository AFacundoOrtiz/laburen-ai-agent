import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const getGeminiModel = (modelName = "gemini-2.5-flash", tools) => {
  return genAI.getGenerativeModel({
    model: modelName,
    tools: tools,
  });
};
