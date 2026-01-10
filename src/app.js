import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mainRouter from "./routes/index.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use("/api", mainRouter);
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("Laburen AI Agent está activo");
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
