import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);

export const arisBrain = async (mensajeUsuario: string, historial: any[]) => {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const chat = model.startChat({ history: historial });
  const result = await chat.sendMessage(mensajeUsuario);
  const response = await result.response;
  return response.text();
};