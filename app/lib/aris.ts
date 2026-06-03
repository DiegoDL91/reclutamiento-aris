import { supabase } from './supabase';

export const arisBrain = async (mensajeUsuario: string, telefono: string) => {
  const apiKey = process.env.GEMINI_API_KEY;

  const { data: info } = await supabase
    .from('candidatos_respuestas')
    .select('*')
    .eq('telefono_whatsapp', telefono)
    .maybeSingle();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const prompt = `
Eres ARIS, una reclutadora amigable y profesional de Rio Logística.

CONTEXTO DEL CANDIDATO (lo que ya sabes):
- Nombre: ${info?.nombre_completo || 'desconocido'}
- Edad: ${info?.edad || 'desconocida'}
- Botas de casquillo: ${info?.tiene_botas_casquillo === null || info?.tiene_botas_casquillo === undefined ? 'no preguntado' : info?.tiene_botas_casquillo}

MENSAJE QUE ENVIÓ EL CANDIDATO AHORA:
"${mensajeUsuario}"

TU TAREA:
1. Analiza el mensaje del candidato y extrae información si la hay.
2. Sigue el flujo en orden: primero nombre → luego edad → luego botas de casquillo.
3. Si el candidato ya dio su nombre antes, NO lo vuelvas a pedir.

REGLAS DE EXTRACCIÓN:
- nombre: Si el mensaje contiene un nombre propio o la persona se presenta (ej: "soy Ana", "me llamo Pedro", "Pedro García"), extrae SOLO el nombre. Si no hay nombre en el mensaje, pon null.
- edad: Si el mensaje contiene un número que puede ser edad (ej: "tengo 25", "25 años", "25"), extrae SOLO el número como string. Si no hay edad, pon null.
- botas: Si el mensaje indica que SÍ tiene botas (ej: "sí", "si", "sí tengo", "cuento con ellas"), pon true. Si indica que NO (ej: "no", "no tengo"), pon false. Si no se menciona, pon null.

RESPONDE ÚNICAMENTE CON ESTE JSON, SIN TEXTO EXTRA, SIN MARKDOWN:
{
  "pregunta": "tu mensaje al candidato",
  "extracccion": {
    "nombre": null,
    "edad": null,
    "botas": null
  }
}
`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: prompt }] 
        }],
        generationConfig: { 
          response_mime_type: "application/json",
          temperature: 0.3
        }
      })
    });

    const resData = await response.json();
    
    console.log("GEMINI RAW:", JSON.stringify(resData).slice(0, 500));

    if (!resData?.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("Gemini sin respuesta:", JSON.stringify(resData));
      throw new Error("Gemini no devolvió texto");
    }

    const texto = resData.candidates[0].content.parts[0].text;
    const parsed = JSON.parse(texto);
    return JSON.stringify(parsed);

  } catch (e) {
    console.error("Gemini error:", e);
    return JSON.stringify({ 
      "pregunta": "Disculpa, hubo un problema. ¿Me repites tu nombre?", 
      "extracccion": { "nombre": null, "edad": null, "botas": null } 
    });
  }
};