import { GoogleGenerativeAI } from "@google/generative-ai";

// Forzamos la lectura de la llave
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export const arisBrain = async (mensajeUsuario: string) => {
  try {
    if (!apiKey) throw new Error("Llave de API no encontrada");

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const promptSistema = `
      Eres ARIS, la IA de Rio Logística.
      Tu misión es entrevistar al candidato.
      
      REGLAS:
      1. Sé profesional y muy breve (máximo 2 renglones).
      2. Saluda y pregunta el nombre si es el primer mensaje.
      3. Pregunta si tiene botas de casquillo.
    `;

    const result = await model.generateContent(`${promptSistema}\n\nCandidato: ${mensajeUsuario}`);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    // Si falla, nos dirá el porqué en los logs de Vercel
    console.error("ERROR CRÍTICO ARIS:", error.message);
    return "¡Hola! Mi sistema está terminando de arrancar. Envíame otro 'Hola' en 5 segundos y ya estaré lista.";
  }
};