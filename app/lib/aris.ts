import { GoogleGenerativeAI } from "@google/generative-ai";

export const arisBrain = async (mensajeUsuario: string) => {
  // 1. Leemos la llave
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return "Error: No se encontró la llave de acceso.";

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // USAMOS EL MODELO "gemini-pro" QUE ES EL MÁS ESTABLE DEL MUNDO
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const promptSistema = "Eres ARIS, asistente de Rio Logística. Saluda, pide nombre y pregunta por botas de casquillo. Sé muy breve (2 líneas).";

    const result = await model.generateContent(`${promptSistema}\n\nCandidato dice: ${mensajeUsuario}`);
    const response = await result.response;
    return response.text();

  } catch (error: any) {
    // Si falla, que nos diga exactamente qué dice Google
    return "ARIS temporalmente fuera de línea. Error: " + error.message;
  }
};