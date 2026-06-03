import { supabase } from './supabase';

export const arisBrain = async (mensajeUsuario: string, telefono: string) => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return "Error: No hay llave de API.";

  // TRAEMOS LA MEMORIA DE LA BASE DE DATOS
  const { data: infoPrevia } = await supabase
    .from('candidatos_respuestas')
    .select('*')
    .eq('telefono_whatsapp', telefono)
    .single();

  // LISTA DE MODELOS (USANDO LOS QUE TÚ ME DIJISTE)
  const modelos = [
    "gemini-3.5-flash" 
  ];

  const instrucciones = `
    Eres ARIS de Rio Logística. Tu misión es llenar estos 25 puntos de entrevista:
    1.Nombre, 2.Edad, 3.Estado Civil, 4.Dependientes, 5.Cuidado hijos, 6.Zona, 7.Traslado, 8.Inconveniente, 9.Escolaridad, 10.Experiencia, 11.Salud, 12.Crónicas, 13.Lesiones, 14.Alergias, 15.Embarazo, 16.Respiratorio, 17.Vértigo, 18.Lentes, 19.Infonavit, 20.Legal, 21.Documentos, 22.Calzado(BOMI/PRHE), 23.Referidos, 24.Reingreso, 25.Banco.

    SITUACIÓN ACTUAL:
    - Ya sabemos esto: ${JSON.stringify(infoPrevia || {})}
    - NO preguntes lo que ya sabes.
    - HAZ UNA SOLA PREGUNTA A LA VEZ.
    - Si no tiene BOTAS o DOCUMENTOS, dile que es OBLIGATORIO.
  `;

  for (const m of modelos) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${instrucciones}\n\nCandidato dice: ${mensajeUsuario}` }] }]
        })
      });
      const data = await response.json();
      if (data.candidates) return data.candidates[0].content.parts[0].text;
    } catch (e) { continue; }
  }
  return "ARIS reajustando sensores... por favor envía un 'Hola'.";
};