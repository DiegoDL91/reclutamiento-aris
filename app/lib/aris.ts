import { supabase } from './supabase';

export const arisBrain = async (mensajeUsuario: string, telefono: string) => {
  const apiKey = process.env.GROQ_API_KEY;

  const { data: info } = await supabase
    .from('candidatos_respuestas')
    .select('*')
    .eq('telefono_whatsapp', telefono)
    .maybeSingle();

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
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    const resData = await response.json();
    console.log("GROQ RAW:", JSON.stringify(resData).slice(0, 300));

    const texto = resData.choices[0].message.content;
    const parsed = JSON.parse(texto);
    return JSON.stringify(parsed);

  } catch (e) {
    console.error("Groq error:", e);
    return JSON.stringify({ 
      "pregunta": "Hola, ¿cuál es tu nombre completo?", 
      "extracccion": { "nombre": null, "edad": null, "botas": null } 
    });
  }
};