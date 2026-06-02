import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY || "");

export const arisBrain = async (mensajeUsuario: string) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const promptSistema = `
      Eres ARIS, la IA de reclutamiento de Rio Logística.
      Tu misión es entrevistar al candidato para el puesto de Auxiliar de Almacén.
      
      REGLAS:
      1. Sé profesional y directo.
      2. Pregunta primero el NOMBRE completo si no lo sabes.
      3. Luego pregunta si tiene BOTAS DE CASQUILLO (esto es OBLIGATORIO).
      4. Pregunta si tiene DOCUMENTACIÓN original completa.
      
      CONTESTA CORTO, MÁXIMO 2 LINEAS.
    `;

    const result = await model.generateContent(`${promptSistema}\n\nCandidato dice: ${mensajeUsuario}`);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    console.error("ERROR GEMINI:", error);
    return "¡Hola! Estamos actualizando mis sistemas. ¿Podrías enviarme un 'Hola' de nuevo en 10 segundos?";
  }
};