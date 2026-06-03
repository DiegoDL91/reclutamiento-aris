export const arisBrain = async (mensajeUsuario: string) => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return "Error: No hay llave de API.";

  // CAMBIO CLAVE: Usamos /v1/ en lugar de /v1beta/
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{
      parts: [{
        text: `Eres ARIS, IA de Rio Logística. Entrevistas para Auxiliar de Almacén. Pregunta nombre y si tiene botas de casquillo. Sé breve. \n\n Candidato: ${mensajeUsuario}`
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

    // Si Google nos da un error de "modelo no encontrado", ahora lo veremos claro
    if (data.error) {
      return `Google dice: ${data.error.message} (Código: ${data.error.code})`;
    }

    return data.candidates[0].content.parts[0].text;

  } catch (error: any) {
    return "Falla de conexión. Intenta de nuevo.";
  }
};