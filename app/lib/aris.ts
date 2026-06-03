export const arisBrain = async (mensajeUsuario: string) => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return "Error: No hay llave de API.";

  // LISTA DE MODELOS A BARRER (Incluyendo los que viste en tu pantalla)
  const modelos = [
    "gemini-1.5-flash",
    "gemini-3.5-flash", 
    "gemini-3.1-flash-lite",
    "gemini-1.5-pro",
    "gemini-pro"
  ];

  const payload = {
    contents: [{ parts: [{ text: `Eres ARIS, de Rio Logística. Responde muy breve (2 líneas): ${mensajeUsuario}` }] }]
  };

  // Intentamos uno por uno hasta que uno conteste
  for (const m of modelos) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.candidates && data.candidates[0]) {
        return data.candidates[0].content.parts[0].text; // ¡ÉXITO!
      }
    } catch (e) {
      continue; // Si este falla, brinca al que sigue
    }
  }

  return "ARIS sigue sin encontrar su cerebro. Pa, revisa si la API Key está activa en Google AI Studio.";
};