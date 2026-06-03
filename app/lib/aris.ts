import { supabase } from './supabase';

export const arisBrain = async (mensajeUsuario: string, telefono: string) => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  // 1. Buscamos qué sabemos del candidato
  const { data: info } = await supabase.from('candidatos_respuestas').select('*').eq('telefono_whatsapp', telefono).maybeSingle();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const instrucciones = `
    Eres ARIS, reclutadora de Rio Logística.
    INFO ACTUAL: ${JSON.stringify(info || {})}
    
    TAREA:
    1. Si en INFO ACTUAL el nombre_completo es null, PÍDELO.
    2. Si ya tienes el nombre, pide la EDAD.
    3. Si ya tienes nombre y edad, pide las BOTAS DE CASQUILLO.
    
    RESPONDE SIEMPRE EN ESTE FORMATO JSON:
    {
      "pregunta": "Tu mensaje para WhatsApp",
      "extracccion": {
        "nombre": "nombre detectado o null",
        "edad": "numero o null",
        "botas": true/false o null
      }
    }
  `;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${instrucciones}\n\nMENSAJE: "${mensajeUsuario}"` }] }],
        generationConfig: { response_mime_type: "application/json" }
      })
    });
    const resData = await response.json();
    return resData.candidates[0].content.parts[0].text;
  } catch (e) {
    return JSON.stringify({ "pregunta": "Hola, ¿me repites tu nombre?", "extracccion": {} });
  }
};