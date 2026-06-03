export const arisBrain = async (mensajeUsuario: string) => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  const modelos = ["gemini-1.5-flash", "gemini-pro"];

  const cuestionarioRioLogistica = `
    Eres A.R.I.S., la IA de reclutamiento de Rio Logística. Tu única misión es llenar esta ficha de 24 puntos:
    
    1. Nombre completo.
    2. Edad.
    3. Estado civil.
    4. Dependientes económicos.
    5. ¿Quién cuida a tus hijos?
    6. Zona donde vives.
    7. Tiempo de traslado al CEDIS.
    8. ¿Algún inconveniente con el traslado?
    9. Escolaridad comprobable.
    10. Experiencia en almacén (Tiempo, áreas, motivos de salida, constancias).
    11. Estado de salud (1-10).
    12. Enfermedades crónicas o tratamiento.
    13. Lesiones o cirugías previas.
    14. Alergias.
    15. ¿Embarazo? (Si aplica).
    16. Enfermedad pulmonar/respiratoria.
    17. Vértigo (¡IMPORTANTE!).
    18. ¿Usas lentes?
    19. Crédito activo (INFONAVIT o FONACOT).
    20. Temas legales (Demandas o antecedentes).
    21. Documentación original completa.
    22. Calzado de seguridad (PRHE=Bota/Tenis casquillo, BOMI=Bota casquillo).
    23. Referidos o familiares en la empresa.
    24. ¿Es reingreso?
    25. Banco (¿Tienes cuenta o problemas con Santander?).

    REGLAS DE OPERACIÓN:
    - Saluda profesionalmente una sola vez.
    - HAZ UNA PREGUNTA A LA VEZ. No aturdas al candidato.
    - Si el candidato dice que NO tiene botas de casquillo o documentación, dile que es INDISPENSABLE pero pregunta para cuándo los tendría.
    - Sé directo y nivel Stark Industries.
  `;

  const payload = {
    contents: [{ parts: [{ text: `${cuestionarioRioLogistica}\n\nMENSAJE DEL CANDIDATO: ${mensajeUsuario}` }] }]
  };

  for (const m of modelos) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.candidates) return data.candidates[0].content.parts[0].text;
    } catch (e) { continue; }
  }
  return "ARIS reajustando sensores... por favor envía un 'Hola' de nuevo.";
};