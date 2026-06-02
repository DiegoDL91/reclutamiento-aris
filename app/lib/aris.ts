import { GoogleGenerativeAI } from "@google/generative-ai";

// Inicializamos con la llave
const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

export const arisBrain = async (mensajeUsuario: string, historial: any[]) => {
  try {
    // Usamos la versión 1.5-flash que es la más rápida y gratis
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const promptSistema = "Eres ARIS, asistente de reclutamiento de Rio Logística. Sé breve, amable y pregunta por botas de casquillo y documentos.";

    const chat = model.startChat({
      history: historial,
    });

    const result = await chat.sendMessage(`${promptSistema} \n\n Candidato dice: ${mensajeUsuario}`);
    const response = await result.response;
    return response.text();
  } catch (error) {
    return "Hola, estoy recibiendo muchos mensajes. ¿Podrías repetirme eso?";
  }
};