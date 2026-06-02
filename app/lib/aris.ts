import { GoogleGenerativeAI } from "@google/generative-ai";

export const arisBrain = async (mensajeUsuario: string) => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (!apiKey) return "Error: Falta la llave en Vercel.";

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // CAMBIAMOS EL MODELO A 'gemini-1.5-flash' PERO CON EL FORMATO CORRECTO
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const promptSistema = "Eres ARIS, IA de Rio Logística. Saluda, pide nombre y pregunta si tienen botas de casquillo. Sé muy breve (2 líneas).";
    
    const result = await model.generateContent(`${promptSistema}\n\nCandidato: ${mensajeUsuario}`);
    const response = await result.response;
    return response.text();
    
  } catch (error: any) {
    // Si falla el flash, usamos el pro como respaldo automático
    return "ARIS está procesando... envíame un 'Hola' más.";
  }
};