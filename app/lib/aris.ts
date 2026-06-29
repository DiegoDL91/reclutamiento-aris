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
  tiempo_traslado_minutos: '¿Cuánto tiempo te toma trasladarte al trabajo, en minutos?',
  inconveniente_traslado: '¿Tienes algún inconveniente para trasladarte al trabajo?',
  escolaridad_comprobable: '¿Cuál es tu nivel de escolaridad comprobable?',
  experiencia_almacen_meses: '¿Cuántos meses de experiencia tienes en almacén?',
  areas_desempenadas: '¿En qué áreas te has desempeñado anteriormente?',
  motivo_salida_anterior: '¿Cuál fue el motivo de tu salida del empleo anterior?',
  tiene_constancias_laborales: '¿Tienes constancias laborales de tus trabajos anteriores?',
  nivel_salud_percecion: '¿Cómo calificarías tu salud general del 1 al 10?',
  enfermedades_cronicas: '¿Tienes alguna enfermedad crónica que debamos conocer?',
  lesiones_o_cirugias: '¿Has tenido alguna lesión o cirugía en el pasado?',
  alergias: '¿Tienes alguna alergia que debamos conocer?',
  problemas_respiratorios: '¿Tienes problemas respiratorios que debamos conocer?',
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
  return NEGATIVOS.includes(s) || s.startsWith('no ') || s.includes('no tengo');
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

  const depVal = estado.dependientes_economicos;
  const depEsCero = depVal !== null && depVal !== undefined &&
    (depVal === 0 || String(depVal) === '0' || esNegativo(String(depVal)));

  if (depEsCero && estado.apoyo_cuidado_dependientes === null) {
    estado.apoyo_cuidado_dependientes = 'No aplica';
  }

  const esPrimerContacto = !info || Object.values(estado).every(v => v === null);
  const camposNulos = CAMPOS.filter(c => estado[c] === null || estado[c] === undefined);

  // campoExtrayendo = lo que el usuario ACABA de responder (camposNulos[0])
  // campoPorPreguntar = lo que hay que preguntar DESPUÉS (camposNulos[1])
  const campoExtrayendo = esPrimerContacto ? null : (camposNulos[0] || null);

  // Detectar si en ESTE mensaje el usuario dijo "no" a dependientes
  const respondioNoDep = campoExtrayendo === 'dependientes_economicos' &&
    esNegativo(String(mensajeUsuario));

  // Campos que quedan DESPUÉS de guardar campoExtrayendo
  let camposRestantes = esPrimerContacto ? camposNulos : camposNulos.slice(1);
  if (respondioNoDep) {
    camposRestantes = camposRestantes.filter(c => c !== 'apoyo_cuidado_dependientes');
  }

  const campoPorPreguntar = camposRestantes[0] || null;
  const tocaPresentarVacante = estado.zona_vivienda !== null && estado.vacante_cedis === null;
  const zonaRecienLlena = campoExtrayendo === 'zona_vivienda';

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

  const systemPrompt = `Eres A.R.I.S., IA de reclutamiento de Rio Logística. Entrevistas por WhatsApp para Auxiliar de Almacén.
Tono: cálido, humano, profesional. Emojis ocasionales.

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

PASO 2 — PREGUNTA LO SIGUIENTE: ${preguntaSugerida}` :
`PRIMER CONTACTO — preséntate y pide nombre_completo`}

PROHIBIDO: preguntar algo que ya tenga valor en el ESTADO. PROHIBIDO: repetir la pregunta que el candidato acaba de contestar.

═══════════════════
DEPENDIENTES — CRÍTICO:
═══════════════════
Si respuesta a dependientes = cualquier negación (no, ninguno, 0, no tengo, etc.):
→ extraccion.dependientes_economicos = 0
→ extraccion.apoyo_cuidado_dependientes = "No aplica"
→ siguiente pregunta: tiempo_traslado_minutos

Si respuesta = afirmación o número:
→ extraccion.dependientes_economicos = número o texto
→ siguiente pregunta: apoyo_cuidado_dependientes

${esPrimerContacto ? `═══════════════════
PRESENTACIÓN — texto exacto:
═══════════════════
"¡Hola! 👋 Soy A.R.I.S., el sistema de inteligencia artificial de reclutamiento de Rio Logística.

Estoy aquí para acompañarte en todo tu proceso de selección de forma rápida y personalizada 🚀

¿Cuál es tu nombre completo?"` : ''}

${(zonaRecienLlena || tocaPresentarVacante) ? `═══════════════════
VACANTE — según zona "${estado.zona_vivienda || mensajeUsuario}":
═══════════════════
CDMX/Azcapotzalco/Rosario/Vallejo → cedis="Editorial":
"Tenemos una vacante de Auxiliar de Almacén en Azcapotzalco, CDMX 📦

💰 Sueldo de $2,205 + bono de $195 por puntualidad. Prestaciones de ley.

🕐 Turnos disponibles:
- Matutino: 6am - 4pm
- Vespertino: 1pm - 10pm
- Nocturno: 10pm - 7am

¿Te interesa? ¿Qué turno te gustaría?"

Cuautitlán/Izcalli/Sabino/EdoMex → cedis="UPS":
"Tenemos una vacante de Auxiliar de Almacén en El Sabino, Cuautitlán Izcalli 📦

💰 Sueldo de $2,205 + bono de $296 por puntualidad. Prestaciones de ley.

🕐 Turnos disponibles:
- Matutino: 8am - 6pm
- Vespertino: 11am - 10pm
- Nocturno: 10pm - 6am

¿Te interesa? ¿Qué turno te gustaría?"

Zona no clara → "¿Puedes trasladarte a Azcapotzalco CDMX o Cuautitlán Izcalli EdoMex?"
Si menciona turno al aceptar → extrae turno_preferido en extraccion.
Si NO le interesa → agradece y cierra.` : ''}

${campoPorPreguntar === 'tiene_botas_casquillo' ? `═══════════════════
BOTAS:
═══════════════════
Sin botas → "¿Podrías conseguirlas?" → Sí puede: true, continúa. No puede: false, continúa igual.
UPS: botas obligatorias. Editorial: botas o tenis de casquillo.` : ''}

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
"Nuestros pagos se realizan a través de Banco Santander 🏦 ¿Con qué banco trabajas actualmente?"
Santander → cuenta_banco_santander_problemas = "Sin problemas - ya tiene Santander"
Otro banco → "¿Has tenido algún adeudo, bloqueo o aclaración con Banco Santander?" → su respuesta = valor del campo` : ''}

${!campoPorPreguntar && !esPrimerContacto ? `═══════════════════
CIERRE — texto exacto:
═══════════════════
"Muchas gracias por tu tiempo, ${estado.nombre_completo || '[nombre]'} 🙌 Ya registré toda tu información. Nuestro equipo de reclutamiento se pondrá en contacto contigo pronto. ¡Que tengas excelente día!"` : ''}

═══════════════════
CLASIFICACIÓN (el candidato no la ve):
═══════════════════
"Nuevo": en proceso
Al terminar TODO:
- "Rechazado": vértigo=true, antecedentes graves, botas=false definitivo
- "Candidato Óptimo": completo, 18-50 años, sin impedimentos
- "Pendiente": banco con problema, doc faltante conseguible, duda

CEDIS: Editorial=Azcapotzalco, UPS=El Sabino. Nunca decirle al candidato.

═══════════════════
RESPONDE SOLO ESTE JSON:
═══════════════════
{
  "pregunta": "tu mensaje",
  "estatus": "Nuevo | Pendiente | Candidato Óptimo | Rechazado",
  "cedis": "Editorial | UPS | null",
  "extraccion": {
    // Enteros: edad, tiempo_traslado_minutos, experiencia_almacen_meses, nivel_salud_percecion, dependientes_economicos (0 si negativo)
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
        const detectado = detectarCedis(info?.zona_vivienda || mensajeUsuario);
        if (detectado) parsed.cedis = detectado;
      }

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
