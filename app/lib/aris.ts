import { GoogleGenerativeAI } from "@google/generative-ai";

export const arisBrain = async (mensajeUsuario: string) => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return "Error: No hay llave de API.";

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // USAMOS EL NOMBRE EXACTO QUE ESTÁ EN TU CAPTURA
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const promptSistema = "Eres ARIS, IA de Rio Logística. Entrevistas para Auxiliar de Almacén. Pregunta nombre y si tiene botas de casquillo. Sé muy breve.";
    
    const result = await model.generateContent(`${promptSistema}\n\nCandidato: ${mensajeUsuario}`);
    const response = result.response;
    return response.text();
    
  } catch (error: any) {
    // Si falla de nuevo, que nos diga exactamente qué carajos pasó
    return "Error detectado: " + error.message;
  }
};