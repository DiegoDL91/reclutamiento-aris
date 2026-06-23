import { supabase } from './supabase';

const CAMPOS = [
  'nombre_completo', 'edad', 'zona_vivienda', 'turno_preferido', 'estado_civil',
  'dependientes_economicos', 'apoyo_cuidado_dependientes', 'tiempo_traslado_minutos',
  'inconveniente_traslado', 'escolaridad_comprobable', 'experiencia_almacen_meses',
  'areas_desempenadas', 'motivo_salida_anterior', 'tiene_constancias_laborales',
  'nivel_salud_percecion', 'enfermedades_cronicas', 'lesiones_o_cirugias', 'alergias',
  'problemas_respiratorios', 'sufre_vertigo', 'usa_lentes',
  'credito_infonavit_fonacot', 'procesos_legales_antecedentes',
  'documentacion_completa_original', 'tiene_botas_casquillo', 'tipo_calzado_actual',
  'referidos_familiares_nombres', 'es_reingreso', 'cuenta_banco_santander_problemas'
];

// Texto de cada pregunta — fuente única de verdad
const PREGUNTAS: Record<string, string> = {
  edad: '¿Cuántos años tienes?',
  zona_vivienda: '¿En qué zona vives?',
  turno_preferido: '¿Cuál es tu turno preferido?',
  estado_civil: '¿Cuál es tu estado civil?',
  dependientes_economicos: '¿Tienes dependientes económicos a tu cargo?',
  apoyo_cuidado_dependientes: '¿Cuentas con apoyo para el cuidado de tus dependientes mientras trabajas?',
  tiempo_traslado_minutos: '¿Cuánto tiempo te toma trasladarte al trabajo, aproximadamente en minutos?',
  inconveniente_traslado: '¿Tienes algún inconveniente para trasladarte al trabajo?',
  escolaridad_comprobable: '¿Cuál es tu nivel de escolaridad comprobable?',
  experiencia_almacen_meses: '¿Cuántos meses de experiencia tienes en almacén?',
  areas_desempenadas: '¿En qué áreas te has desempeñado anteriormente?',
  motivo_salida_anterior: '¿Cuál fue el motivo de tu salida de tu empleo anterior?',
  tiene_constancias_laborales: '¿Cuentas con constancias laborales de tus trabajos anteriores?',
  nivel_salud_percecion: '¿Cómo calificarías tu salud general, del 1 al 10?',
  enfermedades_cronicas: '¿Tienes alguna enfermedad crónica que debamos conocer?',
  lesiones_o_cirugias: '¿Has tenido alguna lesión o cirugía en el pasado?',
  alergias: '¿Tienes alguna alergia que debamos conocer?',
  problemas_respiratorios: '¿Tienes problemas respiratorios que debamos conocer?',
  sufre_vertigo: '¿Sufres de vértigo?',
  usa_lentes: '¿Usas lentes?',
  credito_infonavit_fonacot: '¿Tienes algún crédito Infonavit o Fonacot activo que genere descuento en tu nómina?',
  procesos_legales_antecedentes: '¿Tienes algún proceso legal o antecedentes penales?',
  tiene_botas_casquillo: '¿Tienes botas de casquillo para trabajar en el almacén?',
  tipo_calzado_actual: '¿Qué tipo de calzado usas habitualmente para trabajar?',
  referidos_familiares_nombres: '¿Algún familiar o conocido te refirió a Rio Logística? Si es así, ¿cuál es su nombre?',
};

export const arisBrain = async (mensajeUsuario: any, telefono: any): Promise<string> => {
  const apiKey = process.env.OPENAI_API_KEY;

  const { data: info } = await supabase
    .from('candidatos_respuestas')
    .select('*')
    .eq('telefono_whatsapp', telefono)
    .maybeSingle();

  let historialCompleto: { role: string; content: string }[] = [];
  if (info?.historial) {
    try { historialCompleto = JSON.parse(info.historial); } catch {}
  }
  const historialReciente = historialCompleto.slice(-4);

  const estado: any = {};
  CAMPOS.forEach(c => { estado[c] = (info?.[c] ?? null); });
  estado.vacante_cedis = info?.vacante_cedis ?? null;

  // ¿Sin dependientes? → apoyo no aplica
  const depVal = estado.dependientes_economicos;
  const depLleno = depVal !== null && depVal !== undefined;
  const negativos = ['No','NO','no','ninguno','ningun','ninguna','0','cero','no tengo','nel','nop'];
  const depEsNegativo = depLleno && negativos.some(n => String(depVal).toLowerCase().trim() === n || String(depVal).toLowerCase().includes('no tengo') || String(depVal).toLowerCase().includes('ningun'));

  if (depEsNegativo && estado.apoyo_cuidado_dependientes === null) {
    estado.apoyo_cuidado_dependientes = 'No aplica';
  }

  const esPrimerContacto = !info || Object.values(estado).every(v => v === null);
  const camposNulos = CAMPOS.filter(c => estado[c] === null || estado[c] === undefined);
  const campoEnCurso = camposNulos[0] || null;

  // ¿Ya se presentó la vacante? Si zona está llena pero cedis es null, toca presentar vacante
  const tocaPresentarVacante = estado.zona_vivienda !== null && estado.vacante_cedis === null;

  const preguntaReingreso = estado.vacante_cedis === 'UPS'
    ? '¿Has trabajado anteriormente en Rio Logística o en UPS?'
    : estado.vacante_cedis === 'Editorial'
    ? '¿Has trabajado anteriormente en Rio Logística o en Penguin Random House?'
    : '¿Has trabajado anteriormente en Rio Logística?';

  // Determinar la pregunta exacta a hacer
  let preguntaSugerida = '';
  if (esPrimerContacto) {
    preguntaSugerida = 'PRESÉNTATE (ver formato abajo) y pide nombre_completo';
  } else if (tocaPresentarVacante) {
    preguntaSugerida = 'PRESENTA LA VACANTE (ver formato abajo)';
  } else if (campoEnCurso === 'documentacion_completa_original') {
    preguntaSugerida = 'ENVÍA EL MENSAJE DE DOCUMENTACIÓN (ver formato abajo)';
  } else if (campoEnCurso === 'cuenta_banco_santander_problemas') {
    preguntaSugerida = 'PREGUNTA POR EL BANCO (ver flujo abajo)';
  } else if (campoEnCurso === 'es_reingreso') {
    preguntaSugerida = preguntaReingreso;
  } else if (campoEnCurso && PREGUNTAS[campoEnCurso]) {
    preguntaSugerida = PREGUNTAS[campoEnCurso];
  } else if (!campoEnCurso) {
    preguntaSugerida = 'CIERRA LA CONVERSACIÓN (ver formato abajo)';
  }

  const systemPrompt = `Eres A.R.I.S., IA de reclutamiento de Rio Logística. Entrevistas por WhatsApp para Auxiliar de Almacén.
Tono cálido, profesional, humano. Emojis ocasionales.

═══════════════════════════════
ESTADO DEL CANDIDATO:
═══════════════════════════════
${JSON.stringify(estado, null, 2)}

Campos llenos: ${CAMPOS.filter(c => estado[c] !== null && estado[c] !== undefined).length} de ${CAMPOS.length}
Campo en curso AHORA: ${campoEnCurso || 'NINGUNO (cerrar)'}

═══════════════════════════════
⚡ TU ÚNICA TAREA EN ESTE MENSAJE
═══════════════════════════════
1. El candidato acaba de responder a: "${campoEnCurso || 'cierre'}"
   Su mensaje: "${mensajeUsuario}"
   → EXTRAE el valor de "${campoEnCurso}" en el JSON (campo extraccion). OBLIGATORIO.

2. Tu siguiente pregunta debe ser EXACTAMENTE sobre esto:
   → ${preguntaSugerida}

PROHIBIDO preguntar por cualquier campo que YA tenga valor en el ESTADO.
PROHIBIDO repetir una pregunta ya respondida.
PROHIBIDO saltar de tema. Solo el campo en curso.

═══════════════════════════════
REGLA ESPECIAL — DEPENDIENTES (campo 7 y 8)
═══════════════════════════════
- Pregunta 7 (dependientes_economicos): el candidato responde con texto libre, NO con número.
  Ejemplos: "NO", "No", "no", "no tengo", "sí, 2", "tres", "mi mamá y mi hijo". Guarda lo que diga tal cual.
- Si la respuesta a dependientes es CUALQUIER negación (no, ninguno, no tengo, etc.) → NO preguntes apoyo. Registra apoyo_cuidado_dependientes = "No aplica" y avanza al siguiente campo (tiempo_traslado_minutos).
- Si la respuesta es CUALQUIER afirmación (SI, ÍS, SÍ, Sí, si, sí, un número, nombra a alguien, o lo que sea afirmativo cabron, es tan dificil?) → SÍ pregunta apoyo_cuidado_dependientes.
- El apoyo es para CUALQUIER dependiente (hijos, padres, abuelos), no solo hijos. Por eso la pregunta dice "tus dependientes", no "tus hijos".

${esPrimerContacto ? `═══════════════════════════════
PRIMER CONTACTO — usa EXACTAMENTE:
═══════════════════════════════
"¡Hola! 👋 Soy A.R.I.S., el sistema de inteligencia artificial de reclutamiento de Rio Logística.

Estoy aquí para acompañarte en todo tu proceso de selección de forma rápida y personalizada 🚀

¿Cuál es tu nombre completo?"` : ''}

${tocaPresentarVacante ? `═══════════════════════════════
PRESENTAR VACANTE AHORA:
═══════════════════════════════
Según zona_vivienda = "${estado.zona_vivienda}":

Si es Azcapotzalco/Rosario/Vallejo/CDMX → cedis = "Editorial":
"Tenemos una vacante de Auxiliar de Almacén en Azcapotzalco, CDMX 📦

💰 Sueldo de $2,205 + bono de puntualidad y asistencia de $195. Prestaciones de ley.

🕐 Turnos disponibles:
- Matutino: 7am - 4pm
- Vespertino: 1pm - 10pm
- Nocturno: 10pm - 7am

¿Te interesa? Si es así, ¿cuál turno te gustaría?"

Si es Cuautitlán/Izcalli/Sabino/EdoMex → cedis = "UPS":
"Tenemos una vacante de Auxiliar de Almacén en El Sabino, Cuautitlán Izcalli 📦

💰 Sueldo de $2,205 + bono de puntualidad y asistencia de $296. Prestaciones de ley.

🕐 Turnos disponibles:
- Matutino: 8am - 6pm
- Vespertino: 11am - 9pm
- Nocturno: 10pm - 6am

¿Te interesa? Si es así, ¿cuál turno te gustaría?"

Si la zona no es clara, pregunta: "¿Puedes trasladarte a Azcapotzalco CDMX o a Cuautitlán Izcalli, Estado de México?"
Si menciona el turno al aceptar, extrae turno_preferido en este mismo mensaje.
Si NO le interesa, agradece y cierra.` : ''}

${campoEnCurso === 'documentacion_completa_original' ? `═══════════════════════════════
MENSAJE DE DOCUMENTACIÓN — usa EXACTAMENTE:
═══════════════════════════════
"Para continuar, necesitarás la siguiente documentación 📋

✅ Originales:
- INE
- Solicitud de empleo firmada

📄 Copias:
- Acta de nacimiento
- CURP
- Comprobante de domicilio (no mayor a 3 meses)
- Comprobante de estudios
- Número de Seguro Social
- Constancia de situación fiscal actualizada
- Datos bancarios (cuenta, CLABE, número de tarjeta y banco)

⚠️ Indispensable: Botas de casquillo y pantalón de mezclilla sin roturas

¿Cuentas con toda esta documentación?"` : ''}

${campoEnCurso === 'tiene_botas_casquillo' ? `═══════════════════════════════
BOTAS:
═══════════════════════════════
Si dice que no tiene → pregunta "¿Podrías conseguirlas?". Si puede → registra tiene_botas_casquillo = true. Si definitivamente no → false. NUNCA cortes la entrevista por esto.
UPS: botas obligatorias. Editorial: botas o tenis de casquillo.` : ''}

${campoEnCurso === 'cuenta_banco_santander_problemas' ? `═══════════════════════════════
BANCO — flujo de 2 pasos:
═══════════════════════════════
Paso 1: "Nuestros pagos de nómina se realizan a través de Banco Santander 🏦 ¿Con qué banco trabajas actualmente?"
- Si responde Santander → registra cuenta_banco_santander_problemas = "Sin problemas - ya tiene Santander"
- Si responde otro banco → "¿Has tenido algún adeudo, bloqueo o aclaración pendiente con Banco Santander anteriormente?" → su respuesta es el valor del campo` : ''}

${!campoEnCurso ? `═══════════════════════════════
CIERRE — usa EXACTAMENTE:
═══════════════════════════════
"Muchas gracias por tu tiempo, ${estado.nombre_completo || ''} 🙌 Ya registré toda tu información. Nuestro equipo de reclutamiento se pondrá en contacto contigo pronto. ¡Que tengas excelente día!"` : ''}

═══════════════════════════════
CLASIFICACIÓN (estatus) — el candidato no la ve
═══════════════════════════════
- "Nuevo": entrevista en proceso (hay campos pendientes)
- Solo cuando TODOS los campos estén llenos:
  • "Rechazado": sufre_vertigo = true, antecedentes penales graves, o botas = false definitivo
  • "Candidato Óptimo": completo, 19-45 años, sin impedimentos críticos
  • "Pendiente": banco con problema, edad fuera de rango, situación dudosa

CEDIS: Editorial = Azcapotzalco, UPS = El Sabino. NUNCA lo menciones al candidato.

═══════════════════════════════
RESPONDE SOLO ESTE JSON:
═══════════════════════════════
{
  "pregunta": "tu mensaje (la pregunta sobre el campo en curso, o el texto exacto indicado arriba)",
  "estatus": "Nuevo | Pendiente | Candidato Óptimo | Rechazado",
  "cedis": "Editorial | UPS | null",
  "extraccion": {
    // OBLIGATORIO: incluir "${campoEnCurso}" con el valor que el candidato acaba de dar
    // Números: edad, tiempo_traslado_minutos, experiencia_almacen_meses, nivel_salud_percecion
    // Booleanos true/false (NUNCA "Si"/"No"): inconveniente_traslado, tiene_constancias_laborales, problemas_respiratorios, sufre_vertigo, usa_lentes, documentacion_completa_original, tiene_botas_casquillo, es_reingreso
    // Texto (incluye dependientes_economicos): todo lo demás
  }
}

Campos válidos: ${CAMPOS.join(', ')}.`;

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
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.15,
          response_format: { type: 'json_object' }
        })
      });

      const resData = await response.json();
      const texto = resData?.choices?.[0]?.message?.content;
      if (!texto) throw new Error('sin contenido');

      const parsed = JSON.parse(texto);

      if (info?.vacante_cedis) {
        parsed.cedis = info.vacante_cedis;
      } else {
        const detectado = detectarCedis(info?.zona_vivienda || mensajeUsuario);
        if (detectado) parsed.cedis = detectado;
      }

      if (depEsNegativo) {
        if (!parsed.extraccion) parsed.extraccion = {};
        parsed.extraccion.apoyo_cuidado_dependientes = 'No aplica';
      }

      parsed._historial = [
        ...historialCompleto,
        { role: 'user', content: mensajeUsuario },
        { role: 'assistant', content: parsed.pregunta }
      ].slice(-40);

      return JSON.stringify(parsed);

    } catch (e) {
      console.error(`OpenAI intento ${intento + 1}:`, e);
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