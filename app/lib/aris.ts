import { supabase } from './supabase';

export const arisBrain = async (mensajeUsuario: string, telefono: string) => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  // 1. Buscamos qué sabemos ya (Usamos maybeSingle para que no truene si no hay nada)
  const { data: info } = await supabase.from('candidatos_respuestas').select('*').eq('telefono_whatsapp', telefono).maybeSingle();

  // 2. URL con modo JSON oficial
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const instrucciones = `
    Eres ARIS de Rio Logística. Tu objetivo es llenar: nombre_completo, edad, tiene_botas_casquillo (true/false).
    INFO ACTUAL: ${JSON.stringify(info || {})}
    MENSAJE USUARIO: "${mensajeUsuario}"
    
    INSTRUCCIÓN: Responde unicamente un objeto JSON con esta estructura:
    {
      "pregunta": "tu siguiente pregunta corta",
      "datos": {
        "nombre_completo": "valor o null",
        "edad": "numero o null",
        "tiene_botas_casquillo": true/false o null
      }
    }
  `;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: instrucciones }] }],
        generationConfig: { response_mime_type: "application/json" } // ESTO OBLIGA A GOOGLE A DAR JSON
      })
    });
    const resData = await response.json();
    return resData.candidates[0].content.parts[0].text;
  } catch (e) {
    return JSON.stringify({ "pregunta": "Lo siento, ¿me repites eso?", "datos": {} });
  }
};