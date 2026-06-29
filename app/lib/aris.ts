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
  experiencia_almacen_meses: '¿Cuántos meses de experiencia tienes trabajando en almacén? Si no tienes, dime "ninguna"',
  areas_desempenadas: '¿En qué áreas te has desempeñado anteriormente?',
  motivo_salida_anterior: '¿Cuál fue el motivo de tu salida del empleo anterior?',
  tiene_constancias_laborales: '¿Cuentas con alguna constancia laboral de trabajos anteriores?',
  nivel_salud_percecion: '¿Cómo calificarías tu estado de salud general del 1 al 10, siendo 10 excelente?',
  enfermedades_cronicas: '¿Tienes alguna enfermedad crónica que debamos tomar en cuenta?',
  lesiones_o_cirugias: '¿Has tenido alguna lesión o cirugía relevante?',
  alergias: '¿Tienes alguna alergia que debamos conocer?',
  problemas_respiratorios: '¿Tienes algún problema respiratorio que debamos considerar?',
  sufre_vertigo: '¿Sufres de vértigo?',
  usa_lentes: '¿Usas lentes?',
  credito_infonavit_fonacot: '¿Tienes algún crédito Infonavit o Fonacot activo que genere descuento en tu nómina?',
  procesos_legales_antecedentes: '¿Tienes algún proceso legal o antecedentes penales?',
  tiene_botas_casquillo: '¿Tienes botas de casquillo?',
  referidos_familiares_nombres: '¿Algún familiar o conocido en Rio Logística te refirió? ¿Cuál es su nombre?',
};

const NEGATIVOS = ['no','nel','nop','cero','ninguno','ninguna','ningun','0','nada','ninguna experiencia'];
const esNegativo = (txt: string): boolean => {
  const s = txt.toLowerCase().trim();
  return NEGATIVOS.includes(s) || s.startsWith('no ') || s.includes('no tengo') ||
    s.includes('ninguna') || s.includes('sin experiencia') || s.includes('primer');
};

const detectarCedis = (txt: any): string | null => {
  const z = (txt || '').toLowerCase();
  if (/azcapotzalco|rosario|vallejo|cdmx|ciudad de m|popotla|claveria/.test(z)) return 'Editorial';
  if (/cuautitl|izcalli|sabino|edomex|estado de m|tultitl|tultepec|coacalco|tlalnepantla/.test(z)) return 'UPS';
  return null;
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

  // Auto-skip: sin dependientes → apoyo no aplica
  const depVal = estado.dependientes_economicos;
  const depEsCero = depVal !== null && depVal !== undefined &&
    (depVal === 0 || String(depVal) === '0' || esNegativo(String(depVal)));
  if (depEsCero && estado.apoyo_cuidado_dependientes === null) {
    estado.apoyo_cuidado_dependientes = 'No aplica';
  }

  // Auto-skip: sin experiencia → áreas / motivo / constancias
  const expVal = estado.experiencia_almacen_meses;
  const sinExperiencia = expVal !== null && expVal !== undefined && Number(expVal) === 0;
  if (sinExperiencia) {
    if (estado.areas_desempenadas === null) estado.areas_desempenadas = 'Sin experiencia previa';
    if (estado.motivo_salida_anterior === null) estado.motivo_salida_anterior = 'Sin empleo anterior';
    if (estado.tiene_constancias_laborales === null) estado.tiene_constancias_laborales = false;
  }

  // Auto-fill tipo_calzado_actual desde botas (campo interno, no se pregunta)
  const botasVal = estado.tiene_botas_casquillo;
  if (botasVal !== null && botasVal !== undefined && estado.tipo_calzado_actual === null) {
    estado.tipo_calzado_actual = botasVal === true ? 'Con botas de casquillo' : 'Sin botas (gestionando)';
  }

  const esPrimerContacto = !info || Object.values(estado).every(v => v === null);
  const camposNulos = CAMPOS.filter(c => estado[c] === null || estado[c] === undefined);

  const campoExtrayendo = esPrimerContacto ? null : (camposNulos[0] || null);

  const respondioNoDep = campoExtrayendo === 'dependientes_economicos' && esNegativo(String(mensajeUsuario));
  const respondioSinExp = campoExtrayendo === 'experiencia_almacen_meses' && esNegativo(String(mensajeUsuario));

  let camposRestantes = esPrimerContacto ? camposNulos : camposNulos.slice(1);
  if (respondioNoDep) camposRestantes = camposRestantes.filter(c => c !== 'apoyo_cuidado_dependientes');
  if (respondioSinExp) camposRestantes = camposRestantes.filter(c =>
    !['areas_desempenadas','motivo_salida_anterior','tiene_constancias_laborales'].includes(c));

  const campoPorPreguntar = camposRestantes[0] || null;
  const tocaPresentarVacante = estado.zona_vivienda !== null && estado.vacante_cedis === null;
  const zonaRecienLlena = campoExtrayendo === 'zona_vivienda';

  // Calcular CEDIS y texto completo de vacante en TypeScript
  const cedisDetectado = info?.vacante_cedis ||
    detectarCedis(estado.zona_vivienda) ||
    detectarCedis(mensajeUsuario);

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

  let preguntaSugerida = '';
  if (esPrimerContacto) {
    preguntaSugerida = 'PRESENTACIÓN';
  } else if (zonaRecienLlena || tocaPresentarVacante) {
    preguntaSugerida = 'VACANTE';
  } else if (campoPorPreguntar === 'documentacion_completa_original') {
    preguntaSugerida = 'DOCUMENTACIÓN';
  } else if (campoPorPreguntar === 'cuenta_banco_santander_problemas') {
    preguntaSugerida = 'BANCO';
  } else if (campoPorPreguntar === 'es_reingreso') {
    preguntaSugerida = preguntaReingreso;
  } else if (campoPorPreguntar && PREGUNTAS[campoPorPreguntar]) {
    preguntaSugerida = PREGUNTAS[campoPorPreguntar];
  } else if (!campoPorPreguntar) {
    preguntaSugerida = 'CIERRE';
  }

  // Clasificación en TypeScript — no la decide el modelo
  let clasificacionFinal = 'Nuevo';
  if (!campoPorPreguntar && !esPrimerContacto) {
    const vertigo = estado.sufre_vertigo;
    const botas = estado.tiene_botas_casquillo;
    const cedis = estado.vacante_cedis;
    const banco = String(estado.cuenta_banco_santander_problemas || '').toLowerCase();
    const edad = Number(estado.edad);

    const esRechazo = vertigo === true || (botas === false && cedis === 'UPS');
    const esPendiente = banco.includes('adeudo') || banco.includes('bloqueo') ||
      banco.includes('problema') || (botas === false && cedis !== 'UPS') ||
      edad < 18 || edad > 55;

    clasificacionFinal = esRechazo ? 'Rechazado' : esPendiente ? 'Pendiente' : 'Candidato Óptimo';
  }

  const systemPrompt = `Eres A.R.I.S., IA de reclutamiento de Rio Logística. Entrevistas por WhatsApp para Auxiliar de Almacén.

═══════════════════
ESTADO EN BD (ya guardado):
═══════════════════
${JSON.stringify(estado, null, 2)}

Completados: ${CAMPOS.length - camposNulos.length} / ${CAMPOS.length}

═══════════════════
TU TAREA AHORA:
═══════════════════
${campoExtrayendo ?
`PASO 1 — EXTRAE: El candidato respondió "${campoExtrayendo}" con: "${mensajeUsuario}"
→ Incluye "${campoExtrayendo}" en extraccion. OBLIGATORIO.

${(zonaRecienLlena || tocaPresentarVacante) ?
`⚠️ PASO 2 — OBLIGATORIO: Debes enviar EXACTAMENTE este texto como "pregunta", sin cambiar ni una coma:
"${textoVacante}"` :
`PASO 2 — Tu siguiente mensaje será: "${preguntaSugerida}"`}`
: `PRIMER CONTACTO — preséntate y pide nombre_completo.`}

PROHIBIDO: preguntar algo que ya tenga valor en el ESTADO.
PROHIBIDO: repetir la pregunta que el candidato acaba de contestar.

═══════════════════
TONO — CRÍTICO:
═══════════════════
Eres empática y humana. Una frase corta y natural ANTES de cada pregunta:
- Respuesta positiva → "¡Perfecto!" / "¡Qué bien!" / "Entendido 👍" / "Anotado"
- Enfermedad / cirugía → "Gracias por compartirlo, lo tomo en cuenta"
- Sin experiencia → "¡No hay problema! Todos empezamos en algún momento 😊"
- Despido / problema → "Sin problema, lo que importa es las ganas de trabajar"
- Confusión del candidato → explica brevemente y repite la pregunta con contexto

═══════════════════
PREGUNTAS CON DETALLE:
═══════════════════
Si el campo actual es enfermedades_cronicas, lesiones_o_cirugias, alergias, problemas_respiratorios
Y el candidato dice solo "Sí" sin especificar:
→ NO avances. Pregunta "¿Cuáles?" y guarda el DETALLE como valor del campo.

═══════════════════
DEPENDIENTES:
═══════════════════
Negación → extraccion.dependientes_economicos = 0, extraccion.apoyo_cuidado_dependientes = "No aplica", siguiente: tiempo_traslado_minutos.
Afirmación → extrae y pregunta apoyo_cuidado_dependientes.

═══════════════════
SIN EXPERIENCIA EN ALMACÉN:
═══════════════════
Si dice "no tengo", "ninguna", "es mi primera vez", etc.:
→ extraccion.experiencia_almacen_meses = 0
→ extraccion.areas_desempenadas = "Sin experiencia previa"
→ extraccion.motivo_salida_anterior = "Sin empleo anterior"
→ extraccion.tiene_constancias_laborales = false
→ Avanza directo a nivel_salud_percecion. NO preguntes áreas ni motivo.

═══════════════════
INFONAVIT / FONACOT:
═══════════════════
Si respondió SÍ a credito_infonavit_fonacot:
→ Antes de la siguiente pregunta: "Para el expediente necesitaremos tu hoja de retenciones actualizada 📄 ¿La tienes disponible o puedes conseguirla?"
→ Guarda la respuesta dentro del valor de credito_infonavit_fonacot (texto).
Si respondió NO → continúa normalmente.

═══════════════════
BOTAS:
═══════════════════
SÍ tiene → extrae true, continúa.
NO tiene → "¿Podrías conseguirlas antes de ingresar?"
  → Sí puede: extrae true, continúa.
  → No puede: extrae false, continúa. NUNCA cortes.
UPS: botas obligatorias. Editorial: botas O tenis de casquillo.

${campoPorPreguntar === 'documentacion_completa_original' ? `═══════════════════
DOCUMENTACIÓN — texto exacto:
═══════════════════
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

${campoPorPreguntar === 'cuenta_banco_santander_problemas' ? `═══════════════════
BANCO — 2 pasos:
═══════════════════
"Nuestros pagos de nómina se realizan a través de Banco Santander 🏦 ¿Con qué banco trabajas actualmente?"

Si responde Santander → "¡Perfecto, ya tienes todo listo para tu nómina! 😊" → extrae cuenta_banco_santander_problemas = "Sin problemas - ya tiene Santander"
Si responde otro banco → "Sin problema 😊 Nuestro equipo te tramitará una tarjeta Santander para tu nómina, es algo que manejamos nosotros. Solo dime: ¿has tenido algún adeudo, bloqueo o aclaración pendiente con Banco Santander?" → su respuesta = valor` : ''}

${esPrimerContacto ? `═══════════════════
PRESENTACIÓN — texto exacto:
═══════════════════
"¡Hola! 👋 Soy A.R.I.S., el sistema de inteligencia artificial de reclutamiento de Rio Logística.

Estoy aquí para acompañarte en todo tu proceso de selección de forma rápida y personalizada 🚀

¿Cuál es tu nombre completo?"` : ''}

${!campoPorPreguntar && !esPrimerContacto ? `═══════════════════
CIERRE — texto exacto:
═══════════════════
"Muchas gracias por tu tiempo, ${estado.nombre_completo || '[nombre]'} 🙌 Ya registré toda tu información. Nuestro equipo de reclutamiento se pondrá en contacto contigo pronto. ¡Que tengas excelente día!"` : ''}

Si el candidato dice "adiós", "bye", "olvídalo", "no me interesa", "hasta luego" → cierra: "Sin problema, fue un gusto. Si en el futuro te interesa, aquí estaremos. ¡Que tengas excelente día! 😊"

Estatus: mientras haya campos pendientes = "Nuevo". Al terminar todo = "${clasificacionFinal}".
CEDIS: Editorial=Azcapotzalco, UPS=El Sabino. Nunca decírselo al candidato.

═══════════════════
RESPONDE SOLO ESTE JSON:
═══════════════════
{
  "pregunta": "tu mensaje",
  "estatus": "Nuevo | Pendiente | Candidato Óptimo | Rechazado",
  "cedis": "Editorial | UPS | null",
  "extraccion": {
    // Enteros: edad, tiempo_traslado_minutos, experiencia_almacen_meses (0 si sin experiencia), nivel_salud_percecion, dependientes_economicos (0 si negativo)
    // Booleanos true/false: inconveniente_traslado, tiene_constancias_laborales, problemas_respiratorios, sufre_vertigo, usa_lentes, documentacion_completa_original, tiene_botas_casquillo, es_reingreso
    // Texto: nombre_completo, zona_vivienda, turno_preferido, estado_civil, apoyo_cuidado_dependientes, escolaridad_comprobable, areas_desempenadas, motivo_salida_anterior, enfermedades_cronicas, lesiones_o_cirugias, alergias, credito_infonavit_fonacot, procesos_legales_antecedentes, referidos_familiares_nombres, cuenta_banco_santander_problemas
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

      // Override cedis
      if (info?.vacante_cedis) {
        parsed.cedis = info.vacante_cedis;
      } else {
        const detectado = detectarCedis(estado.zona_vivienda) || detectarCedis(mensajeUsuario);
        if (detectado) parsed.cedis = detectado;
      }

      // Override clasificacion cuando termina
      if (!campoPorPreguntar && !esPrimerContacto) {
        parsed.estatus = clasificacionFinal;
      }

      // Force auto-fills dependientes
      if (respondioNoDep || depEsCero) {
        if (!parsed.extraccion) parsed.extraccion = {};
        parsed.extraccion.apoyo_cuidado_dependientes = 'No aplica';
        if (respondioNoDep) parsed.extraccion.dependientes_economicos = 0;
      }

      // Force auto-fills sin experiencia
      if (respondioSinExp || sinExperiencia) {
        if (!parsed.extraccion) parsed.extraccion = {};
        if (respondioSinExp) parsed.extraccion.experiencia_almacen_meses = 0;
        if (!parsed.extraccion.areas_desempenadas) parsed.extraccion.areas_desempenadas = 'Sin experiencia previa';
        if (!parsed.extraccion.motivo_salida_anterior) parsed.extraccion.motivo_salida_anterior = 'Sin empleo anterior';
        if (parsed.extraccion.tiene_constancias_laborales === undefined) parsed.extraccion.tiene_constancias_laborales = false;
      }

      // Auto-fill tipo_calzado_actual desde botas
      if (parsed.extraccion?.tiene_botas_casquillo !== undefined && parsed.extraccion?.tiene_botas_casquillo !== null) {
        if (!parsed.extraccion) parsed.extraccion = {};
        parsed.extraccion.tipo_calzado_actual = parsed.extraccion.tiene_botas_casquillo === true
          ? 'Con botas de casquillo' : 'Sin botas (gestionando)';
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