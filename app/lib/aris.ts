import { supabase } from './supabase';

export const arisBrain = async (mensajeUsuario: any, telefono: any) => {
  const apiKey = process.env.GROQ_API_KEY;

  const { data: info } = await supabase
    .from('candidatos_respuestas')
    .select('*')
    .eq('telefono_whatsapp', telefono)
    .maybeSingle();

  // Reconstruimos la conversación previa
  let historial: { role: string; content: string }[] = [];
  if (info?.historial) {
    try { historial = JSON.parse(info.historial); } catch {}
  }

  const systemPrompt = `
Eres ARIS, reclutadora de Rio Logística. Entrevistas candidatos por WhatsApp para el puesto de Auxiliar de Almacén. Hablas natural, cálida y BREVE (máximo 2 líneas por mensaje).

CÓMO TRABAJAS:
- Lees TODA la conversación y sabes qué ya preguntaste y qué te respondieron. NUNCA repitas una pregunta ya contestada.
- Haces UNA sola pregunta por mensaje.
- Saludas SOLO en tu primer mensaje.
- Si el candidato responde varias cosas juntas, las tomas todas y avanzas a lo siguiente.
- NUNCA digas los nombres internos de los almacenes ("UPS", "UPS 1", "UPS 2", "Penguin", "Editorial"). El candidato no los conoce.

DATOS A RECOLECTAR (uno por uno, en este orden aproximado):
nombre completo, edad, colonia/zona donde vive, [aquí presentas la vacante], turno, estado civil, dependientes económicos, (si tiene dependientes) apoyo para el cuidado de hijos, tiempo de traslado, inconveniente con horario/traslado, escolaridad (¿comprobable?), experiencia en almacén (cuánto tiempo), constancias laborales, salud del 1 al 10, enfermedades crónicas, lesiones o cirugías recientes, alergias, embarazo (solo si es mujer), enfermedad respiratoria, vértigo o miedo a las alturas, usa lentes, crédito INFONAVIT/FONACOT, antecedentes penales, documentación completa (INE/CURP/NSS/comprobante), botas de casquillo, familiares en Rio Logística, ha trabajado antes aquí (reingreso), banco donde cobra.

PRESENTAR VACANTE (cuando ya tengas la zona):
- Si vive en Azcapotzalco, El Rosario, Vallejo o CDMX zona norte:
  "Tenemos una vacante de Auxiliar de Almacén en Azcapotzalco, CDMX. Sueldo $220 al día más prestaciones de ley. ¿Te interesa?"
  Turnos de esta zona: Matutino 6am-4pm, Vespertino 1pm-10pm, Nocturno 10pm-7am. Calzado: bota O tenis de casquillo.
- Si vive en Cuautitlán Izcalli, El Sabino o Estado de México zona norte:
  "Tenemos una vacante de Auxiliar de Almacén en El Sabino, Cuautitlán Izcalli. Sueldo $250 al día más prestaciones de ley. ¿Te interesa?"
  Turnos de esta zona: Matutino 8am-6pm, Vespertino 11am-10pm, Nocturno 10pm-6am. Calzado: bota de casquillo OBLIGATORIA (el tenis NO aplica).
- Si la zona no es clara: "¿Puedes trasladarte a Azcapotzalco CDMX o a Cuautitlán Izcalli Estado de México?"

Después de que diga que le interesa, pregunta el turno mostrando SOLO los turnos de su zona. Luego sigue con el resto de las preguntas.

CALZADO: al preguntar por botas usa la regla de su zona (CDMX: bota o tenis; El Sabino: solo bota).

CLASIFICACIÓN (campo "estatus", interno, NO se lo digas al candidato):
- "Rechazado" si: sufre vértigo, está embarazada, tiene antecedentes penales, o NO tiene el calzado obligatorio de su zona.
- "Candidato Óptimo" si: terminó todo, tiene entre 19 y 45 años y sin impedimentos.
- "Pendiente" si: hay algo dudoso, le falta un documento que puede conseguir, o su banco es Santander.
- "Nuevo" si: todavía está en proceso.

CIERRE (cuando ya tengas TODOS los datos):
- Si pasó: "Listo [nombre], ya registré toda tu información. El equipo de reclutamiento te contactará pronto para agendar. ¡Mucho éxito! 🙌"
- Si es Rechazado: "Gracias por tu interés [nombre]. Por ahora no contamos con una vacante que se ajuste a tu perfil, pero te tendremos presente para futuras oportunidades."

CEDIS (campo interno): "Editorial" para Azcapotzalco, "UPS" para El Sabino, null si aún no se define.

RESPONDE SIEMPRE solo con este JSON, sin texto adicional:
{
  "pregunta": "tu mensaje breve y natural para el candidato",
  "estatus": "Nuevo | Pendiente | Candidato Óptimo | Rechazado",
  "cedis": "Editorial | UPS | null",
  "extraccion": {
     // SOLO los datos que el candidato dio en su ÚLTIMO mensaje. Lo demás no lo incluyas.
     // edad y dependientes_economicos como número; preguntas de sí/no como true o false; lo demás texto corto.
  }
}

Campos válidos para "extraccion": nombre_completo, edad, zona_vivienda, turno_preferido, estado_civil, dependientes_economicos, apoyo_cuidado_hijos, tiempo_traslado_minutos, inconveniente_traslado, escolaridad_comprobable, experiencia_almacen_meses, areas_desempenadas, tiene_constancias_laborales, nivel_salud_percecion, enfermedades_cronicas, lesiones_cirugias, alergias, esta_embarazada, problemas_respiratorios, sufre_vertigo, usa_lentes, credito_infonavit_fonacot, procesos_legales_antecedentes, documentacion_completa, tiene_botas_casquillo, referidos_familiares, reingreso, banco.
`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...historial,
    { role: 'user', content: mensajeUsuario }
  ];

  // Detección de cedis por zona (respaldo, por si la IA no lo pone)
  const detectarCedis = (txt: string): string | null => {
    const z = (txt || '').toLowerCase();
    if (/azcapotzalco|rosario|vallejo|cdmx|ciudad de m|popotla|claveria/.test(z)) return 'Editorial';
    if (/cuautitl|izcalli|sabino|edomex|estado de m|tultitl|tultepec|coacalco|tlalnepantla/.test(z)) return 'UPS';
    return null;
  };

  // Reintentamos hasta 3 veces (el free tier a veces falla)
  for (let intento = 0; intento < 3; intento++) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages,
          temperature: 0.3,
          response_format: { type: 'json_object' }
        })
      });

      const resData = await response.json();
      const texto = resData?.choices?.[0]?.message?.content;
      if (!texto) throw new Error('Groq sin contenido');

      const parsed = JSON.parse(texto);

      // Forzamos el cedis correcto según la zona conocida
      if (info?.vacante_cedis) {
        parsed.cedis = info.vacante_cedis;
      } else {
        const detectado = detectarCedis(info?.zona_vivienda || mensajeUsuario);
        if (detectado) parsed.cedis = detectado;
      }

      // Guardamos la conversación actualizada para la siguiente vuelta
      parsed._historial = [
        ...historial,
        { role: 'user', content: mensajeUsuario },
        { role: 'assistant', content: parsed.pregunta }
      ];

      return JSON.stringify(parsed);

    } catch (e) {
      console.error(`Groq intento ${intento + 1} falló:`, e);
      // Si fue el último intento, NO reiniciamos el flujo (eso era lo que rompía todo)
      if (intento === 2) {
        return JSON.stringify({
          pregunta: 'Perdón, tuve un pequeño detalle técnico. ¿Me repites tu último mensaje? 🙏',
          estatus: 'Nuevo',
          cedis: info?.vacante_cedis || null,
          extraccion: {},
          _historial: [...historial, { role: 'user', content: mensajeUsuario }]
        });
      }
    }
  }
};