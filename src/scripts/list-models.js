import dotenv from "dotenv";

dotenv.config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.models) {
      console.log("Modelos disponibles:");
      data.models.forEach((m) => {
        if (m.supportedGenerationMethods.includes("generateContent")) {
          console.log(
            `   - ${m.name.replace("models/", "")} (${m.displayName})`
          );
        }
      });
    } else {
      console.error("Error:", data);
    }
  } catch (error) {
    console.error("Error de conexión:", error);
  }
}

listModels();
