import { supabase } from './supabase';

export const arisBrain = async (mensajeUsuario: string, telefono: string) => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  // 1. Buscamos qué sabemos ya de este número
  const { data: info } = await supabase.from('candidatos_respuestas').select('*').eq('telefono_whatsapp', telefono).single();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  // 2. Le pedimos a ARIS que sea una máquina de datos
  const instrucciones = `
    Eres ARIS de Rio Logística. Entrevistas para Auxiliar de Almacén.
    INFO ACTUAL: ${JSON.stringify(info || {})}
    
    TU MISIÓN:
    1. Analiza el mensaje del usuario: "${mensajeUsuario}".
    2. Responde EXCLUSIVAMENTE en este formato JSON (sin texto extra):
    {
      "pregunta": "Tu siguiente pregunta (breve, máximo 15 palabras)",
      "datos": {
        "nombre_completo": "extrae el nombre o deja null",
        "edad": "extrae numero o deja null",
        "tiene_botas_casquillo": true/false o null
      }
    }
    3. REGLA: Si ya tienes un dato en INFO ACTUAL, NO lo preguntes. Pasa al siguiente.
    4. Los puntos críticos son: Nombre, Edad y Botas de Casquillo.
  `;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: instrucciones }] }] })
    });
    const resData = await response.json();
    return resData.candidates[0].content.parts[0].text;
  } catch (e) {
    return JSON.stringify({ "pregunta": "Hola, ¿podrías repetir eso?", "datos": {} });
  }
};