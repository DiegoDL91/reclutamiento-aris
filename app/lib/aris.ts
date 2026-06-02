import { GoogleGenerativeAI } from "@google/generative-ai";

export const arisBrain = async (mensajeUsuario: string) => {
  // Intentamos leer la llave de dos formas por si acaso
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return "Error: No encontré la llave de API en Vercel. Revisa las variables de entorno.";
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const promptSistema = "Eres ARIS, IA de Rio Logística. Entrevista al candidato de forma breve (2 líneas).";
    
    const result = await model.generateContent(`${promptSistema}\n\nCandidato: ${mensajeUsuario}`);
    const response = await result.response;
    return response.text();
    
  } catch (error: any) {
    // ESTO NOS DIRÁ EL ERROR REAL EN WHATSAPP
    return "Error de Google: " + error.message;
  }
};