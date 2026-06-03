import { supabase } from './supabase';

export const arisBrain = async (mensajeUsuario: string, telefono: string) => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  // 1. Buscamos qué sabemos del candidato
  const { data: info } = await supabase.from('candidatos_respuestas').select('*').eq('telefono_whatsapp', telefono).maybeSingle();

  // 2. URL de Google
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const instrucciones = `
    Eres ARIS, reclutadora de Rio Logística.
    INFO ACTUAL: ${JSON.stringify(info || {})}
    
    TAREA:
    1. Analiza el mensaje: "${mensajeUsuario}".
    2. Si el mensaje es un saludo o no hay datos nuevos, pregunta lo siguiente que falte (Nombre, Edad o Botas).
    3. Responde SOLAMENTE un objeto JSON:
    {
      "respuesta_whatsapp": "Tu mensaje para el candidato aquí",
      "datos_detectados": {
        "nombre": "nombre encontrado o null",
        "edad": "numero encontrado o null",
        "botas": true/false o null
      }
    }
  `;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: instrucciones }] }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });
    const resData = await response.json();
    return resData.candidates[0].content.parts[0].text;
  } catch (e) {
    return JSON.stringify({ "respuesta_whatsapp": "¡Hola! Soy ARIS. ¿Con quién tengo el gusto?", "datos_detectados": {} });
  }
};