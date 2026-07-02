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

const PREGUNTAS: Record<string, string> = {
  edad: '¿Cuántos años tienes?',
  zona_vivienda: '¿En qué zona vives?',
  turno_preferido: '¿Cuál es tu turno preferido: matutino, vespertino o nocturno?',
  estado_civil: '¿Cuál es tu estado civil?',
  dependientes_economicos: '¿Tienes dependientes económicos a tu cargo?',
  apoyo_cuidado_dependientes: '¿Cuentas con apoyo para el cuidado de tus dependientes mientras trabajas?',
  tiempo_traslado_minutos: '¿Cuánto tiempo te tomaría trasladarte al almacén de Rio Logística, en minutos aproximadamente?',
  inconveniente_traslado: '¿Tienes algún inconveniente para trasladarte al trabajo?',
  escolaridad_comprobable: '¿Cuál es tu nivel de escolaridad comprobable?',
  experiencia_almacen_meses: '¿Cuántos meses de experiencia tienes en almacén? (Si no tienes, dime "ninguna")',
  areas_desempenadas: '¿En qué áreas te has desempeñado anteriormente?',
  motivo_salida_anterior: '¿Cuál fue el motivo de tu salida del empleo anterior?',
  tiene_constancias_laborales: '¿Tienes constancias laborales de tus trabajos anteriores?',
  nivel_salud_percecion: '¿Cómo calificarías tu estado de salud del 1 al 10, siendo 10 excelente?',
  enfermedades_cronicas: '¿Tienes alguna enfermedad crónica que debamos conocer?',
  lesiones_o_cirugias: '¿Has tenido alguna lesión o cirugía relevante?',
  alergias: '¿Tienes alguna alergia que debamos conocer?',
  problemas_respiratorios: '¿Tienes algún problema respiratorio que debamos considerar?',
  sufre_vertigo: '¿Sufres de vértigo?',
  usa_lentes: '¿Usas lentes?',
  credito_infonavit_fonacot: '¿Tienes algún crédito Infonavit o Fonacot activo que genere descuento en tu nómina?',
  procesos_legales_antecedentes: '¿Tienes algún proceso legal o antecedentes penales?',
  tiene_botas_casquillo: '¿Tienes botas de casquillo?',
  tipo_calzado_actual: '¿Qué tipo de calzado usas habitualmente para trabajar?',
  referidos_familiares_nombres: '¿Algún familiar o conocido en Rio Logística te refirió? ¿Cuál es su nombre?',
};

const NEGATIVOS = ['no','nel','nop','cero','ninguno','ninguna','ningun','0'];
const esNegativo = (txt: string): boolean => {
  const s = txt.toLowerCase().trim();
  return NEGATIVOS.includes(s) || s.startsWith('no ') || s.includes('no tengo') || s.includes('ninguna');
};

const detectarCedis = (txt: any): string | null => {
  const z = (txt || '').toLowerCase();
  if (/azcapotzalco|rosario|vallejo|cdmx|ciudad de m|popotla|claveria/.test(z)) return 'Editorial';
  if (/cuautitl|izcalli|sabino|edomex|estado de m|tultitl|tultepec|coacalco|tlalnepantla/.test(z)) return 'UPS';
  return null;
};

const TEXT_DOC = `Para continuar, necesitarás la siguiente documentación 📋

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

¿Cuentas con toda esta documentación?`;

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

  const depVal = estado.dependientes_economicos;
  const depEsCero = depVal !== null && depVal !== undefined &&
    (depVal === 0 || String(depVal) === '0' || esNegativo(String(depVal)));
  if (depEsCero && estado.apoyo_cuidado_dependientes === null) {
    estado.apoyo_cuidado_dependientes = 'No aplica';
  }

  const esPrimerContacto = !info || Object.values(estado).every(v => v === null);
  const camposNulos = CAMPOS.filter(c => estado[c] === null || estado[c] === undefined);
  const campoExtrayendo = esPrimerContacto ? null : (camposNulos[0] || null);

  const respondioNoDep = campoExtrayendo === 'dependientes_economicos' && esNegativo(String(mensajeUsuario));

  let camposRestantes = esPrimerContacto ? camposNulos : camposNulos.slice(1);
  if (respondioNoDep) camposRestantes = camposRestantes.filter(c => c !== 'apoyo_cuidado_dependientes');

  const campoPorPreguntar = camposRestantes[0] || null;
  const tocaPresentarVacante = estado.zona_vivienda !== null && estado.vacante_cedis === null;
  const zonaRecienLlena = campoExtrayendo === 'zona_vivienda';

  const cedisDetectado = info?.vacante_cedis || detectarCedis(estado.zona_vivienda) || detectarCedis(mensajeUsuario);
  let textoVacante = '¿Puedes trasladarte a Azcapotzalco CDMX o a Cuautitlán Izcalli, Estado de México?';
  if (cedisDetectado === 'Editorial') {
    textoVacante = `Tenemos una vacante de Auxiliar de Almacén en Azcapotzalco, CDMX 📦\n\n💰 Sueldo de $2,205 + bono de $195 por puntualidad. Prestaciones de ley.\n\n🕐 Turnos disponibles:\n• Matutino: 6am - 4pm\n• Vespertino: 1pm - 10pm\n• Nocturno: 10pm - 7am\n\n¿Te interesa? ¿Qué turno te gustaría?`;
  } else if (cedisDetectado === 'UPS') {
    textoVacante = `Tenemos una vacante de Auxiliar de Almacén en El Sabino, Cuautitlán Izcalli 📦\n\n💰 Sueldo de $2,205 + bono de $296 por puntualidad. Prestaciones de ley.\n\n🕐 Turnos disponibles:\n• Matutino: 8am - 6pm\n• Vespertino: 11am - 10pm\n• Nocturno: 10pm - 6am\n\n¿Te interesa? ¿Qué turno te gustaría?`;
  }

  const preguntaReingreso = estado.vacante_cedis === 'UPS'
    ? '¿Has trabajado anteriormente en Rio Logística o en UPS?'
    : estado.vacante_cedis === 'Editorial'
    ? '¿Has trabajado anteriormente en Rio Logística o en Penguin Random House?'
    : '¿Has trabajado anteriormente en Rio Logística?';

  const textoCierre = `Muchas gracias por tu tiempo, ${estado.nombre_completo || '[nombre]'} 🙌 Ya registré toda tu información. Nuestro equipo de reclutamiento se pondrá en contacto contigo pronto. ¡Que tengas excelente día!`;

  // preguntaSugerida = SIEMPRE texto completo, NUNCA keywords
  let preguntaSugerida = '';
  if (esPrimerContacto) {
    preguntaSugerida = `¡Hola! 👋 Soy A.R.I.S., el sistema de inteligencia artificial de reclutamiento de Rio Logística.\n\nEstoy aquí para acompañarte en todo tu proceso de selección de forma rápida y personalizada 🚀\n\n¿Cuál es tu nombre completo?`;
  } else if (zonaRecienLlena || tocaPresentarVacante) {
    preguntaSugerida = textoVacante;
  } else if (campoPorPreguntar === 'documentacion_completa_original') {
    preguntaSugerida = TEXT_DOC;
  } else if (campoPorPreguntar === 'cuenta_banco_santander_problemas') {
    preguntaSugerida = 'Nuestros pagos de nómina se realizan a través de Banco Santander 🏦 ¿Con qué banco trabajas actualmente?';
  } else if (campoPorPreguntar === 'es_reingreso') {
    preguntaSugerida = preguntaReingreso;
  } else if (campoPorPreguntar && PREGUNTAS[campoPorPreguntar]) {
    preguntaSugerida = PREGUNTAS[campoPorPreguntar];
  } else if (!campoPorPreguntar) {
    preguntaSugerida = textoCierre;
  }

  // Clasificación en TypeScript
  let clasificacionFinal = 'Nuevo';
  if (!campoPorPreguntar && !esPrimerContacto) {
    const vertigo = estado.sufre_vertigo;
    const botas = estado.tiene_botas_casquillo;
    const cedis = estado.vacante_cedis;
    const banco = String(estado.cuenta_banco_santander_problemas || '').toLowerCase();
    const edad = Number(estado.edad);
    const esRechazo = vertigo === true || (botas === false && cedis === 'UPS');
    const esPendiente = banco.includes('adeudo') || banco.includes('bloqueo') || banco.includes('problema') ||
      (botas === false && cedis !== 'UPS') || edad < 18 || edad > 55;
    clasificacionFinal = esRechazo ? 'Rechazado' : esPendiente ? 'Pendiente' : 'Candidato Óptimo';
  }

  const systemPrompt = `Eres A.R.I.S., IA de reclutamiento de Rio Logística. Entrevistas por WhatsApp para Auxiliar de Almacén.

ESTADO EN BD (tu verdad absoluta):
${JSON.stringify(estado, null, 2)}

Completados: ${CAMPOS.length - camposNulos.length} / ${CAMPOS.length}

══════════════════════════════════════
TU TAREA EN ESTE MENSAJE:
══════════════════════════════════════
${campoExtrayendo ?
`PASO 1 — EXTRAE: El candidato respondió a "${campoExtrayendo}" con: "${mensajeUsuario}"
Incluye "${campoExtrayendo}" en extraccion. OBLIGATORIO SIN EXCEPCIÓN.

PASO 2 — ENVÍA EXACTAMENTE ESTE TEXTO como "pregunta" (copia y pega, no cambies ni una palabra):
${preguntaSugerida}` :
`PRIMER CONTACTO — Envía exactamente como "pregunta":
${preguntaSugerida}`}

ATENCIÓN: El campo "pregunta" en tu JSON debe ser el texto del PASO 2. NUNCA palabras sueltas como "BANCO", "DOCUMENTACIÓN" o "CIERRE". Siempre un mensaje completo dirigido al candidato.

══════════════════════════════════════
EXCEPCIONES (modifican el PASO 2):
══════════════════════════════════════

TONO: Puedes agregar UNA frase corta ANTES del PASO 2:
- Enfermedad/lesión → "Gracias por compartirlo, lo tomo en cuenta."
- Sin experiencia → "¡No hay problema, todos empezamos algún día! 😊"
- Respuesta positiva → "¡Perfecto!" o "Entendido 👍"
- Problema/negativo → "Sin problema,"

DETALLE EN SALUD: Si extrajiste enfermedades_cronicas, lesiones_o_cirugias, alergias, o problemas_respiratorios, y el candidato solo dijo "Sí" sin detalles:
→ NO envíes el PASO 2 todavía. Pregunta "¿Cuáles?" y espera el detalle. El detalle ES el valor a guardar.

DEPENDIENTES: Si "${campoExtrayendo}" es dependientes_economicos y la respuesta es negación:
→ extraccion.dependientes_economicos = 0
→ extraccion.apoyo_cuidado_dependientes = "No aplica"

BOTAS: Si "${campoPorPreguntar}" es tiene_botas_casquillo y el candidato dice que NO tiene:
→ Pregunta: "¿Podrías conseguirlas antes de ingresar?"
  • Sí puede → extrae true, continúa.
  • No puede → extrae false, continúa igual. NUNCA termines la entrevista por esto.
UPS: botas obligatorias. Editorial: botas O tenis de casquillo.

INFONAVIT: Si "${campoExtrayendo}" es credito_infonavit_fonacot y dijo "Sí":
→ Antes del PASO 2: "Para el expediente necesitaremos tu hoja de retenciones actualizada 📄 ¿La tienes o puedes conseguirla?"
→ Su respuesta = parte del valor de credito_infonavit_fonacot. Luego continúa al PASO 2.

BANCO 2do PASO: Si el candidato acaba de decir su banco (BBVA, Coppel, etc.) y NO es Santander:
→ Envía: "Sin problema 😊 Nuestro equipo te tramitará tu tarjeta Santander sin complicaciones. ¿Has tenido algún adeudo, bloqueo o aclaración pendiente con Banco Santander anteriormente?"
→ Su respuesta es el valor de cuenta_banco_santander_problemas.
Si dice Santander → extrae "Sin problemas - ya tiene Santander" y envía el cierre si no hay más campos.

DESPEDIDA: Si el candidato dice "adiós", "no me interesa", "hasta luego":
→ "Sin problema, fue un gusto. Si en el futuro te interesa, aquí estaremos. ¡Que tengas excelente día! 😊"

PROHIBIDO:
- Preguntar campos que ya tengan valor en el ESTADO.
- Inventar preguntas no incluidas en el PASO 2.
- Usar palabras clave como "BANCO", "CIERRE", "DOCUMENTACIÓN" como pregunta.

Estatus actual: "${!campoPorPreguntar && !esPrimerContacto ? clasificacionFinal : 'Nuevo'}"
CEDIS: Editorial=Azcapotzalco, UPS=El Sabino. Nunca decírselo al candidato.

══════════════════════════════════════
RESPONDE SOLO ESTE JSON:
══════════════════════════════════════
{
  "pregunta": "frase empática opcional + texto del PASO 2 completo",
  "estatus": "Nuevo | Pendiente | Candidato Óptimo | Rechazado",
  "cedis": "Editorial | UPS | null",
  "extraccion": {
    // Enteros: edad, tiempo_traslado_minutos, experiencia_almacen_meses (0 si ninguna), nivel_salud_percecion, dependientes_economicos (0 si negativo)
    // Booleanos true/false: inconveniente_traslado, tiene_constancias_laborales, problemas_respiratorios, sufre_vertigo, usa_lentes, documentacion_completa_original, tiene_botas_casquillo, es_reingreso
    // Texto: todo lo demás
  }
}

Campos válidos: ${CAMPOS.join(', ')}.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...historialReciente,
    { role: 'user', content: mensajeUsuario }
  ];

  for (let intento = 0; intento < 2; intento++) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.1,
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
        const detectado = detectarCedis(estado.zona_vivienda) || detectarCedis(mensajeUsuario);
        if (detectado) parsed.cedis = detectado;
      }

      if (!campoPorPreguntar && !esPrimerContacto) parsed.estatus = clasificacionFinal;

      if (respondioNoDep || depEsCero) {
        if (!parsed.extraccion) parsed.extraccion = {};
        parsed.extraccion.apoyo_cuidado_dependientes = 'No aplica';
        if (respondioNoDep) parsed.extraccion.dependientes_economicos = 0;
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