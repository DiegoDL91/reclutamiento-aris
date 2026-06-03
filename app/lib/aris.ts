export const arisBrain = async (mensajeUsuario: string) => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) return "Error: No hay llave de API.";

  // LA LISTA QUE SÍ FUNCIONA (LOS 5 QUE ME DIJISTE)
  const modelos = [
    "gemini-1.5-flash",
    "gemini-3.5-flash", 
    "gemini-3.1-flash-lite",
    "gemini-1.5-pro",
    "gemini-pro"
  ];

  const cuestionarioRioLogistica = `
    Eres A.R.I.S., la IA de Rio Logística. Tu MISIÓN es entrevistar al candidato para Auxiliar de Almacén llenando estos 25 puntos:
    
    1. Nombre completo | 2. Edad | 3. Estado civil | 4. Dependientes económicos | 5. ¿Quién cuida a tus hijos?
    6. Zona donde vives | 7. Tiempo de traslado al CEDIS | 8. ¿Algún inconveniente con el traslado?
    9. Escolaridad comprobable | 10. Experiencia en almacén | 11. Estado de salud (1-10)
    12. Enfermedades crónicas | 13. Lesiones o cirugías | 14. Alergias | 15. ¿Embarazo?
    16. Enfermedad respiratoria | 17. Vértigo (CRÍTICO) | 18. ¿Usas lentes?
    19. Crédito INFONAVIT/FONACOT | 20. Temas legales | 21. Documentación original completa
    22. Calzado de seguridad (PRHE=Bota/Tenis casquillo, BOMI=Bota casquillo)
    23. Referidos/Familiares | 24. ¿Es reingreso? | 25. Banco (Santander).

    REGLAS:
    - HAZ UNA PREGUNTA A LA VEZ. No aturdas.
    - Si no tiene BOTAS o DOCUMENTOS, dile que es requisito pero pregunta para cuándo los tendría.
    - Sé profesional, breve y directa. No hables de envíos.
  `;

  // Barrido de modelos uno por uno
  for (const m of modelos) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${cuestionarioRioLogistica}\n\nCandidato: ${mensajeUsuario}` }] }]
        })
      });

      const data = await response.json();

      if (data.candidates && data.candidates[0]) {
        return data.candidates[0].content.parts[0].text; // SI ESTE JALA, AQUÍ SE ACABA
      }
    } catch (e) {
      continue; // Si falla, intenta el que sigue de la lista de 5
    }
  }

  return "ARIS reajustando sensores... por favor envía un 'Hola' de nuevo.";
};