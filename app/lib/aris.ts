import { GoogleGenerativeAI } from "@google/generative-ai";

// Usamos la variable de entorno, es lo correcto
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export const arisBrain = async (mensajeUsuario: string) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const promptSistema = `Eres ARIS, la IA de Rio Logística. Entrevistas para Auxiliar de Almacén. Sé breve, pregunta nombre y si tiene botas de casquillo.`;

    const result = await model.generateContent(`${promptSistema}\n\nCandidato: ${mensajeUsuario}`);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("ERROR GEMINI:", error.message);
    return "¡Hola! Estamos terminando de configurar mi cerebro. Dame un minuto y envíame otro 'Hola'.";
  }
};