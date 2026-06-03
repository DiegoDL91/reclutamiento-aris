import { supabase } from './supabase';

export const arisBrain = async (mensajeUsuario: string, telefono: string) => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  // 1. Traemos lo que ya existe en la base de datos
  const { data: info } = await supabase.from('candidatos_respuestas').select('*').eq('telefono_whatsapp', telefono).maybeSingle();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const instrucciones = `
    Eres ARIS, reclutadora pro de Rio Logística. 
    ESTADO ACTUAL EN BASE DE DATOS: ${JSON.stringify(info || {})}

    TU OBJETIVO: Llenar las columnas (nombre_completo, edad, tiene_botas_casquillo).
    
    REGLAS CRÍTICAS:
    1. Si el usuario dice "Hola", "Buenas tardes", etc, NO es su nombre. El nombre debe ser un nombre de persona.
    2. Si el usuario da su nombre, extráelo.
    3. Responde ÚNICAMENTE un objeto JSON puro:
    {
      "mensaje_para_whatsapp": "Tu respuesta amable y breve",
      "datos_a_guardar": {
        "nombre_completo": "Nombre real o null",
        "edad": "Número o null",
        "tiene_botas_casquillo": true/false o null
      }
    }
  `;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${instrucciones}\n\nMENSAJE RECIBIDO: "${mensajeUsuario}"` }] }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });
    const resData = await response.json();
    return resData.candidates[0].content.parts[0].text;
  } catch (e) {
    return JSON.stringify({ "mensaje_para_whatsapp": "¡Hola! Soy ARIS de Rio Logística. ¿Con quién tengo el gusto?", "datos_a_guardar": {} });
  }
};