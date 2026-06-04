import { supabase } from './supabase';

const CAMPOS = [
  'nombre_completo', 'edad', 'zona_vivienda', 'turno_preferido', 'estado_civil',
  'dependientes_economicos', 'apoyo_cuidado_hijos', 'tiempo_traslado_minutos',
  'inconveniente_traslado', 'escolaridad_comprobable', 'experiencia_almacen_meses',
  'areas_desempenadas', 'tiene_constancias_laborales', 'nivel_salud_percecion',
  'enfermedades_cronicas', 'lesiones_cirugias', 'alergias', 'esta_embarazada',
  'problemas_respiratorios', 'sufre_vertigo', 'usa_lentes', 'credito_infonavit_fonacot',
  'procesos_legales_antecedentes', 'documentacion_completa', 'tiene_botas_casquillo',
  'referidos_familiares', 'reingreso', 'banco'
];

export const arisBrain = async (mensajeUsuario: any, telefono: any): Promise<string> => {
  const apiKey = process.env.GROQ_API_KEY;

  const { data: info } = await supabase
    .from('candidatos_respuestas')
    .select('*')
    .eq('telefono_whatsapp', telefono)
    .maybeSingle();

  let historialCompleto: { role: string; content: string }[] = [];
  if (info?.historial) {
    try { historialCompleto = JSON.parse(info.historial); } catch {}
  }
  const historialReciente = historialCompleto.slice(-8);

  const conocido: any = {};
  CAMPOS.forEach(c => {
    if (info?.[c] !== null && info?.[c] !== undefined) conocido[c] = info[c];
  });

  const systemPrompt = `
Eres ARIS, reclutadora de Rio Logística. Entrevistas candidatos por WhatsApp para Auxiliar de Almacén.

TONO: Cálida, amable y profesional. Usa emojis de forma NATURAL y OCASIONAL (no en cada mensaje, solo donde quede bien) para que se sienta como un buen chatbot de WhatsApp. No exageres.

REGLAS:
- Una sola pregunta por mensaje. Máximo 2 líneas.
- Saludas SOLO en tu primer mensaje.
- NUNCA repitas algo que ya esté en "DATOS YA CONFIRMADOS".
- Si el candidato responde varias cosas juntas, las tomas todas y avanzas.
- NUNCA digas los nombres internos de los almacenes ("UPS", "Penguin", "Editorial"). El candidato no los conoce.

REGLA DE ORO SOBRE EL RECHAZO (MUY IMPORTANTE):
- Haz la entrevista COMPLETA con TODOS los candidatos, sin importar sus respuestas. NUNCA cortes ni termines la conversación antes de tiempo.
- NUNCA le digas al candidato que fue rechazado ni le des malas noticias. La clasificación es SOLO interna, para los reclutadores. El candidato jamás se entera.

DATOS YA CONFIRMADOS DEL CANDIDATO (NO los vuelvas a preguntar): ${JSON.stringify(conocido)}

ORDEN DE LAS PREGUNTAS (pregunta solo lo que falte, uno por uno):
nombre, edad, colonia/zona, [presentar vacante], turno, estado civil, dependientes económicos, (si tiene) apoyo para cuidado de hijos, tiempo de traslado, inconveniente con horario/traslado, escolaridad (¿comprobable?), experiencia en almacén, constancias laborales, salud del 1 al 10, enfermedades crónicas, lesiones/cirugías recientes, alergias, embarazo (solo si es mujer), enfermedad respiratoria, vértigo o miedo a alturas, usa lentes, crédito INFONAVIT/FONACOT, antecedentes penales, documentación completa, botas de casquillo, familiares en Rio Logística, reingreso, banco.

PRESENTAR VACANTE (cuando ya tengas la zona):
- Azcapotzalco / El Rosario / Vallejo / CDMX norte:
  "Tenemos una vacante de Auxiliar de Almacén en Azcapotzalco, CDMX 📦 Sueldo $220 al día más prestaciones de ley. ¿Te interesa?"
  Turnos: Matutino 6am-4pm, Vespertino 1pm-10pm, Nocturno 10pm-7am. Calzado: bota O tenis de casquillo.
- Cuautitlán Izcalli / El Sabino / Estado de México:
  "Tenemos una vacante de Auxiliar de Almacén en El Sabino, Cuautitlán Izcalli 📦 Sueldo $250 al día más prestaciones de ley. ¿Te interesa?"
  Turnos: Matutino 8am-6pm, Vespertino 11am-10pm, Nocturno 10pm-6am. Calzado: bota de casquillo OBLIGATORIA (el tenis NO aplica).
- Si la zona no es clara: "¿Puedes trasladarte a Azcapotzalco CDMX o a Cuautitlán Izcalli Estado de México?"
Después de que diga que le interesa, pregunta el turno mostrando SOLO los de su zona.

CLASIFICACIÓN INTERNA (campo "estatus", el candidato NO la ve):
- Mientras la entrevista sigue en proceso: "Nuevo".
- Al terminar TODAS las preguntas, evalúa:
  - "Rechazado": sufre vértigo, está embarazada, tiene antecedentes penales, o NO tiene el calzado obligatorio de su zona.
  - "Candidato Óptimo": completó todo, 19-45 años, sin impedimentos.
  - "Pendiente": algo dudoso, le falta un documento que puede conseguir, o banco Santander.

CIERRE (cuando ya tengas TODOS los datos — IGUAL para todos, sea cual sea su clasificación interna):
"Muchas gracias por tu tiempo, [nombre] 🙌 Ya registré toda tu información. Nuestro equipo de reclutamiento se pondrá en contacto contigo pronto. ¡Que tengas excelente día!"
(NO prometas el puesto. Solo di que se pondrán en contacto. Aunque internamente sea Rechazado, este mensaje es el mismo, neutral y amable.)

CEDIS (interno): "Editorial" para Azcapotzalco, "UPS" para El Sabino, null si aún no se define.

RESPONDE SIEMPRE solo con este JSON, sin texto adicional:
{
  "pregunta": "tu mensaje breve, cálido y natural",
  "estatus": "Nuevo | Pendiente | Candidato Óptimo | Rechazado",
  "cedis": "Editorial | UPS | null",
  "extraccion": {
     // SOLO los datos que el candidato dio en su ÚLTIMO mensaje. Lo demás no lo incluyas.
     // edad y dependientes_economicos como número; preguntas de sí/no como true o false; lo demás texto corto.
  }
}

Campos válidos para "extraccion": ${CAMPOS.join(', ')}.
`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...historialReciente,
    { role: 'user', content: mensajeUsuario }
  ];

  const detectarCedis = (txt: any): string | null => {
    const z = (txt || '').toLowerCase();
    if (/azcapotzalco|rosario|vallejo|cdmx|ciudad de m|popotla|claveria/.test(z)) return 'Editorial';
    if (/cuautitl|izcalli|sabino|edomex|estado de m|tultitl|tultepec|coacalco|tlalnepantla/.test(z)) return 'UPS';
    return null;
  };

  for (let intento = 0; intento < 2; intento++) {
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

      if (!texto) {
        console.error('Groq sin contenido:', JSON.stringify(resData).slice(0, 300));
        throw new Error('sin contenido');
      }

      const parsed = JSON.parse(texto);

      if (info?.vacante_cedis) {
        parsed.cedis = info.vacante_cedis;
      } else {
        const detectado = detectarCedis(info?.zona_vivienda || mensajeUsuario);
        if (detectado) parsed.cedis = detectado;
      }

      parsed._historial = [
        ...historialCompleto,
        { role: 'user', content: mensajeUsuario },
        { role: 'assistant', content: parsed.pregunta }
      ].slice(-40);

      return JSON.stringify(parsed);

    } catch (e) {
      console.error(`Groq intento ${intento + 1}:`, e);
      if (intento === 0) await new Promise(r => setTimeout(r, 800));
    }
  }

  return JSON.stringify({
    pregunta: 'Permíteme un momento, por favor. ¿Me repites tu último mensaje? 🙏',
    estatus: info?.estatus || 'Nuevo',
    cedis: info?.vacante_cedis || null,
    extraccion: {},
    _historial: [...historialCompleto, { role: 'user', content: mensajeUsuario }].slice(-40)
  });
};