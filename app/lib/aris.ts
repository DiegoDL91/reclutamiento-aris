import { supabase } from './supabase';

export const arisBrain = async (mensajeUsuario: string, telefono: string) => {
  const apiKey = process.env.GEMINI_API_KEY;

  const { data: info } = await supabase
    .from('candidatos_respuestas')
    .select('*')
    .eq('telefono_whatsapp', telefono)
    .maybeSingle();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const instrucciones = `
Eres ARIS, reclutadora de Rio Logística. Estás entrevistando a un candidato por WhatsApp.

DATOS QUE YA TIENES DEL CANDIDATO:
${JSON.stringify(info || {})}

MENSAJE QUE ACABA DE ENVIAR EL CANDIDATO:
"${mensajeUsuario}"

INSTRUCCIONES:
- Lee el MENSAJE del candidato y extrae cualquier información que mencione.
- Si el candidato dice su nombre (ejemplo: "Me llamo Diego", "Soy Ana", "Diego"), extrae ese nombre.
- Si el candidato dice su edad (ejemplo: "tengo 25 años", "25"), extrae esa edad.
- Si el candidato menciona botas de casquillo (ejemplo: "sí tengo", "no tengo"), extrae eso.

FLUJO DE CONVERSACIÓN:
1. Si nombre_completo es null, pide el nombre.
2. Si ya tienes nombre pero edad es null, pide la edad.
3. Si ya tienes nombre y edad pero no sabes de botas, pregunta si tiene botas de casquillo.
4. Si tienes todo, agradece y di que el equipo lo contactará.

RESPONDE ÚNICAMENTE EN ESTE FORMATO JSON SIN TEXTO EXTRA:
{
  "pregunta": "Tu siguiente mensaje para el candidato",
  "extracccion": {
    "nombre": "nombre completo detectado en el mensaje o null",
    "edad": "numero detectado en el mensaje o null",
    "botas": true o false o null
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
    return JSON.stringify({ "pregunta": "Hola, ¿me repites tu nombre?", "extracccion": {} });
  }
};