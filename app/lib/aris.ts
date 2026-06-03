import { GoogleGenerativeAI } from "@google/generative-ai";

export const arisBrain = async (mensajeUsuario: string) => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return "Error: No se encontró la llave de acceso.";

  const genAI = new GoogleGenerativeAI(apiKey);
  
  // LISTA DE MODELOS (Intentaremos uno por uno)
  const modelosATestear = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
  
  for (const nombreModelo of modelosATestear) {
    try {
      const model = genAI.getGenerativeModel({ model: nombreModelo });
      const promptSistema = "Eres ARIS, de Rio Logística. Sé breve, pide nombre y pregunta por botas de casquillo.";
      
      const result = await model.generateContent(`${promptSistema}\n\nCandidato: ${mensajeUsuario}`);
      const response = await result.response;
      return response.text(); // Si llega aquí, es que este modelo SÍ funcionó
    } catch (e) {
      console.log(`Modelo ${nombreModelo} falló, intentando el siguiente...`);
      continue; 
    }
  }

  return "ARIS está en mantenimiento técnico. Intenta enviar 'Hola' en 1 minuto.";
};