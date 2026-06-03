import { supabase } from './supabase';

export const arisBrain = async (mensajeUsuario: string, telefono: string) => {
  const apiKey = process.env.GROQ_API_KEY;

  const { data: info } = await supabase
    .from('candidatos_respuestas')
    .select('*')
    .eq('telefono_whatsapp', telefono)
    .maybeSingle();

  const nombre = info?.nombre_completo || null;
  const edad = info?.edad || null;
  const botas = info?.tiene_botas_casquillo ?? null;

  const prompt = `
Eres ARIS, reclutadora profesional y amigable de Rio Logística.

LO QUE YA SABES DEL CANDIDATO:
- Nombre: ${nombre ? nombre : 'No lo sabes aún'}
- Edad: ${edad ? edad + ' años' : 'No la sabes aún'}
- Botas de casquillo: ${botas === true ? 'SÍ tiene' : botas === false ? 'NO tiene' : 'No lo sabes aún'}

MENSAJE ACTUAL DEL CANDIDATO: "${mensajeUsuario}"

INSTRUCCIONES ESTRICTAS:
- Si NO tienes el nombre → pídelo. No hagas nada más.
- Si TIENES nombre pero NO tienes edad → pide la edad. No hagas nada más.
- Si TIENES nombre y edad pero NO sabes de botas → pregunta si tiene botas de casquillo. No hagas nada más.
- Si TIENES nombre, edad y botas → agradece y di que el equipo lo contactará pronto.
- NUNCA repitas una pregunta que ya fue respondida.
- NUNCA pidas algo que ya tienes.

EXTRACCIÓN DEL MENSAJE ACTUAL:
- nombre: Si el candidato dice su nombre en este mensaje, extráelo SOLO el nombre (sin "me llamo", sin "soy"). Si no dice nombre, pon null.
- edad: Si el candidato dice un número que es su edad, ponlo como string. Si no, pon null.
- botas: Si dice que SÍ tiene botas (si, sí, tengo, cuento con ellas), pon true. Si dice que NO, pon false. Si no menciona botas, pon null.

RESPONDE SOLO CON ESTE JSON SIN TEXTO EXTRA:
{
  "pregunta": "tu mensaje para el candidato",
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
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    const resData = await response.json();
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