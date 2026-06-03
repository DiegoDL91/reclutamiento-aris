import { supabase } from './supabase';

export const arisBrain = async (mensajeUsuario: string, telefono: string) => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return "Error: No hay llave de API.";

  // TRAEMOS LO QUE YA SABEMOS DEL CANDIDATO (Nuestra memoria)
  const { data: infoPrevia } = await supabase
    .from('candidatos_respuestas')
    .select('*')
    .eq('telefono_whatsapp', telefono)
    .single();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  // LE DAMOS TODA LA INFO A LA IA PARA QUE NO RECOJA DATOS QUE YA TIENE
  const payload = {
    contents: [{
      parts: [{
        text: `
          Eres ARIS de Rio Logística. Estás entrevistando para Auxiliar de Almacén.
          
          ESTADO ACTUAL DEL CANDIDATO:
          - Nombre registrado: ${infoPrevia?.nombre_completo || 'Desconocido'}
          - Edad registrada: ${infoPrevia?.edad || 'Desconocida'}
          - Estatus: ${infoPrevia?.estatus}
          
          MISIÓN:
          1. Mira qué datos faltan de los 25 puntos.
          2. Si ya tienes el nombre y la edad, NO los vuelvas a preguntar. 
          3. Sigue con la ZONA DONDE VIVE y las BOTAS DE CASQUILLO.
          4. Sé muy breve (2 líneas máximo).
          
          MENSAJE NUEVO DEL CANDIDATO: ${mensajeUsuario}
        `
      }]
    }]
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    return "ARIS reajustando sensores... envíame un 'Hola'.";
  }
};