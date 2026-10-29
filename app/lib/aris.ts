import { supabase } from './supabase';

/* ══════════════════════════════════════════════════════════════
   ARIS · Cerebro de entrevista (30 pasos)
   El CÓDIGO escribe cada pregunta. El sí/no lo entiende el código.
   La IA solo es respaldo.
   ══════════════════════════════════════════════════════════════ */

const CAMPOS = [
  'nombre_completo', 'edad', 'zona_vivienda', 'turno_preferido', 'estado_civil',
  'dependientes_economicos', 'apoyo_cuidado_dependientes', 'tiempo_traslado_minutos',
  'inconveniente_traslado', 'escolaridad_comprobable', 'experiencia_almacen_meses',
  'areas_desempenadas', 'motivo_salida_anterior', 'tiene_constancias_laborales',
  'nivel_salud_percecion', 'enfermedades_cronicas', 'lesiones_o_cirugias', 'alergias',
  'problemas_respiratorios', 'sufre_vertigo', 'usa_lentes', 'credito_infonavit_fonacot',
  'procesos_legales_antecedentes', 'documentacion_completa_original', 'tiene_botas_casquillo',
  'tipo_calzado_actual', 'referidos_familiares_nombres', 'es_reingreso',
  'cuenta_banco_santander_problemas'
];

const BOOL = new Set(['inconveniente_traslado', 'tiene_constancias_laborales', 'problemas_respiratorios', 'sufre_vertigo', 'usa_lentes', 'documentacion_completa_original', 'tiene_botas_casquillo', 'es_reingreso']);
const INT = new Set(['edad', 'tiempo_traslado_minutos', 'experiencia_almacen_meses', 'nivel_salud_percecion']);
const SALUD_DETALLE = new Set(['enfermedades_cronicas', 'lesiones_o_cirugias', 'alergias']);

const PREGUNTAS: Record<string, string> = {
  edad: '¿Cuántos años tienes?',
  zona_vivienda: '¿En qué zona vives?',
  estado_civil: '¿Cuál es tu estado civil?',
  dependientes_economicos: '¿Tienes dependientes económicos a tu cargo? ¿Cuántos?',
  apoyo_cuidado_dependientes: '¿Cuentas con apoyo para el cuidado de tus dependientes mientras trabajas?',
  tiempo_traslado_minutos: '¿Cuánto tiempo te tomaría trasladarte al almacén, en minutos aproximadamente?',
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
  referidos_familiares_nombres: '¿Algún familiar o conocido en Rio Logística te refirió?',
};

// Textos de seguimiento (2do/3er paso). El código los manda TAL CUAL.
const FU_CUALES       = '¿Cuáles? Cuéntame un poco para dejarlo registrado. 📝';
const FU_BOTAS        = '¿Podrías conseguirlas antes de ingresar? 👢';
const FU_CUAL_CREDITO = '¿Cuál de los dos: Infonavit o Fonacot?';
const FU_INFONAVIT    = 'Para el expediente necesitaremos tu hoja de retenciones actualizada 📄 ¿La tienes o puedes conseguirla?';
const FU_REF_NOMBRE   = '¡Qué bien! ¿Cuál es su nombre completo?';
const Q_BANCO1        = 'Nuestros pagos de nómina se realizan a través de Banco Santander 🏦 ¿Con qué banco trabajas actualmente?';
const FU_BANCO2       = 'Sin problema 😊 Nuestro equipo te tramitará tu tarjeta Santander sin complicaciones. ¿Has tenido algún adeudo, bloqueo o aclaración pendiente con Banco Santander?';
const FU_BANCO3       = '¿Cuál de esos: un adeudo, un bloqueo o una aclaración?';

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

const cierreTexto = (nombre: any): string =>
  `¡Listo${nombre ? ', ' + nombre : ''}! 🙌 Hemos registrado tu postulación correctamente. Te recordamos que este registro no garantiza la contratación ni el avance en el proceso. Si tu perfil es seleccionado, te contactaremos. ¡Gracias por tu interés!`;

/* ── Normalizadores robustos de SÍ / NO ── */
const norm = (s: any = ''): string => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const esNegativo = (txt: any): boolean => {
  const s = norm(txt);
  const c = s.replace(/[^a-z]/g, '');
  if (['no', 'nel', 'nop', 'nou', 'nain', 'nada', 'cero', 'ninguna', 'ninguno', 'ningun', 'nunca', 'jamas', 'negativo'].includes(c)) return true;
  return /\b(no|nel|nop|nunca|jamas|ninguna|ninguno|ningun|nada|negativo|no tengo|no cuento|no puedo)\b/.test(s);
};

const esAfirmativo = (txt: any): boolean => {
  if (esNegativo(txt)) return false; // el "no" siempre gana (ej: "no tengo mi constancia")
  const s = norm(txt);
  const c = s.replace(/[^a-z]/g, '');
  if (/^s+i+$/.test(c)) return true; // si, sii, siii, siiii...
  if (['si', 'sip', 'sipi', 'simon', 'sale', 'va', 'dale', 'claro', 'obvio', 'correcto', 'afirmativo', 'exacto', 'porsupuesto', 'asies', 'sisi', 'siclaro'].includes(c)) return true;
  return /\b(si|claro|obvio|correcto|afirmativo|sale|simon|por supuesto|asi es|tengo|si tengo|cuento con|puedo|ya la tengo|ya lo tengo)\b/.test(s);
};

// Afirmación "seca": dijo que sí pero sin dar detalle
const esSoloAfirmativo = (txt: any): boolean => {
  if (!esAfirmativo(txt)) return false;
  const resto = norm(txt)
    .replace(/\b(si|claro|obvio|correcto|afirmativo|sale|simon|por supuesto|asi es|tengo|si tengo|pues|la verdad|de hecho|creo que|una|un|algo|algunas?|algunos?)\b/g, '')
    .replace(/[^a-z]/g, '');
  return resto.length <= 2;
};

const quiereSalir = (txt: any): boolean => {
  const s = norm(txt);
  return ['adios', 'hasta luego', 'no me interesa', 'ya no me interesa', 'mejor no', 'ya no quiero', 'no gracias'].some(f => s === f || s === f + '.');
};

const detectarCedis = (txt: any): string | null => {
  const z = norm(txt);
  if (/azcapotzalco|rosario|vallejo|cdmx|ciudad de m|popotla|claveria/.test(z)) return 'Editorial';
  if (/cuautitl|izcalli|sabino|edomex|estado de m|tultitl|tultepec|coacalco|tlalnepantla/.test(z)) return 'UPS';
  return null;
};

const soloEntero = (txt: any): number | null => {
  const s = norm(txt);
  if (/ningun|nada|cero|sin experiencia|^no$/.test(s)) return 0;
  const m = s.match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
};

const limpiarNombre = (t: any): string =>
  String(t).replace(/^\s*(hola,?\s*)?(me llamo|mi nombre es|soy)\s+/i, '').trim();

/* ── IA SOLO de respaldo ── */
async function iaExtrae(apiKey: string, campo: string, mensajeUsuario: string): Promise<any> {
  if (!apiKey) return null;
  const tipo = BOOL.has(campo) ? 'true o false' : (INT.has(campo) ? 'un número entero' : 'texto breve');
  const sys = `Extrae el valor del campo "${campo}" del mensaje del candidato. Responde SOLO JSON {"valor": X} donde X es ${tipo}. Si no se puede determinar, {"valor": null}.`;
  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini', temperature: 0, response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: sys }, { role: 'user', content: String(mensajeUsuario) }]
      })
    });
    const d = await r.json();
    const t = d?.choices?.[0]?.message?.content;
    if (!t) return null;
    return JSON.parse(t)?.valor ?? null;
  } catch { return null; }
}

async function extraer(apiKey: string, campo: string, mensajeUsuario: string): Promise<any> {
  if (campo === 'nombre_completo') return limpiarNombre(mensajeUsuario);

  if (campo === 'turno_preferido') {
    const s = norm(mensajeUsuario);
    if (/matut|manana|maniana|6am|8am/.test(s)) return 'Matutino';
    if (/vesper|tarde|1pm|11am/.test(s)) return 'Vespertino';
    if (/noct|noche|10pm/.test(s)) return 'Nocturno';
    return String(mensajeUsuario).trim();
  }

  if (BOOL.has(campo)) {
    if (esAfirmativo(mensajeUsuario)) return true;
    if (esNegativo(mensajeUsuario)) return false;
    const ia = await iaExtrae(apiKey, campo, mensajeUsuario);
    if (ia === true || ia === 'true') return true;
    if (ia === false || ia === 'false') return false;
    return false;
  }

  if (INT.has(campo)) {
    const n = soloEntero(mensajeUsuario);
    if (n !== null) return n;
    const ia = await iaExtrae(apiKey, campo, mensajeUsuario);
    const ni = typeof ia === 'number' ? ia : parseInt(String(ia), 10);
    return isNaN(ni) ? 0 : ni;
  }

  return String(mensajeUsuario).trim();
}

function vacante(cedis: string | null): string {
  if (cedis === 'Editorial') return `Tenemos una vacante de Auxiliar de Almacén en Azcapotzalco, CDMX 📦\n\n💰 Sueldo de $2,205 + bono de $195 por puntualidad. Prestaciones de ley.\n\n🕐 Turnos disponibles:\n• Matutino: 6am - 4pm\n• Vespertino: 1pm - 10pm\n• Nocturno: 10pm - 7am\n\n¿Te interesa? ¿Qué turno te gustaría?`;
  if (cedis === 'UPS') return `Tenemos una vacante de Auxiliar de Almacén en El Sabino, Cuautitlán Izcalli 📦\n\n💰 Sueldo de $2,205 + bono de $296 por puntualidad. Prestaciones de ley.\n\n🕐 Turnos disponibles:\n• Matutino: 8am - 6pm\n• Vespertino: 11am - 10pm\n• Nocturno: 10pm - 6am\n\n¿Te interesa? ¿Qué turno te gustaría?`;
  return '¿Puedes trasladarte a Azcapotzalco, CDMX o a Cuautitlán Izcalli, Estado de México? ¿Qué turno te gustaría: matutino, vespertino o nocturno?';
}

function textoPregunta(campo: string, cedis: string | null): string {
  if (campo === 'turno_preferido') return vacante(cedis);
  if (campo === 'documentacion_completa_original') return TEXT_DOC;
  if (campo === 'cuenta_banco_santander_problemas') return Q_BANCO1;
  if (campo === 'es_reingreso') {
    return cedis === 'UPS' ? '¿Has trabajado anteriormente en Rio Logística o en UPS?'
      : cedis === 'Editorial' ? '¿Has trabajado anteriormente en Rio Logística o en Penguin Random House?'
      : '¿Has trabajado anteriormente en Rio Logística?';
  }
  return PREGUNTAS[campo] || '¿Podrías contarme un poco más?';
}

function clasificar(e: any): string {
  const vertigo = e.sufre_vertigo === true;
  const botas = e.tiene_botas_casquillo;
  const cedis = e.vacante_cedis;
  const banco = norm(e.cuenta_banco_santander_problemas);
  const edad = Number(e.edad);

  const esRechazo = vertigo || (botas === false && cedis === 'UPS');
  const esPendiente = banco.includes('adeudo') || banco.includes('bloqueo') || banco.includes('aclaracion')
    || (botas === false && cedis !== 'UPS') || edad < 18 || edad > 55;

  return esRechazo ? 'Rechazado' : esPendiente ? 'Pendiente' : 'Candidato Óptimo';
}

/* ══════════════════════════════════════════════════════════════
   FUNCIÓN PRINCIPAL
   ══════════════════════════════════════════════════════════════ */
export const arisBrain = async (mensajeUsuario: any, telefono: any): Promise<string> => {
  const apiKey = process.env.OPENAI_API_KEY || '';

  const { data: info } = await supabase
    .from('candidatos_respuestas').select('*')
    .eq('telefono_whatsapp', telefono).maybeSingle();

  let historial: { role: string; content: string }[] = [];
  if (info?.historial) { try { historial = JSON.parse(info.historial); } catch {} }
  const ultimoBot = [...historial].reverse().find(m => m.role === 'assistant')?.content || '';
  const ultimoUser = [...historial].reverse().find(m => m.role === 'user')?.content || '';

  const estado: any = {};
  CAMPOS.forEach(c => { estado[c] = info?.[c] ?? null; });
  estado.vacante_cedis = info?.vacante_cedis ?? null;

  if ((estado.dependientes_economicos === 0 || String(estado.dependientes_economicos) === '0') && estado.apoyo_cuidado_dependientes == null) {
    estado.apoyo_cuidado_dependientes = 'No aplica';
  }

  const empaquetar = (pregunta: string, extraccion: any, estatus: string, cedis: any): string => JSON.stringify({
    pregunta, estatus, cedis: cedis ?? null, extraccion,
    _historial: [...historial, { role: 'user', content: String(mensajeUsuario) }, { role: 'assistant', content: pregunta }].slice(-40)
  });

  const yaSaludo = historial.some(m => m.role === 'assistant');

  // 1) PRIMER CONTACTO
  if (!yaSaludo) {
    const saludo = '¡Hola! 👋 Soy A.R.I.S., el sistema de inteligencia artificial de reclutamiento de Rio Logística.\n\nEstoy aquí para acompañarte en tu proceso de selección de forma rápida y personalizada 🚀\n\n¿Cuál es tu nombre completo?';
    return empaquetar(saludo, {}, 'Nuevo', estado.vacante_cedis);
  }

  // 2) DESPEDIDA explícita
  if (quiereSalir(mensajeUsuario)) {
    const despedida = 'Sin problema, fue un gusto. Si en el futuro te interesa, aquí estaremos. ¡Que tengas excelente día! 😊';
    return empaquetar(despedida, {}, info?.estatus || 'Nuevo', estado.vacante_cedis);
  }

  const campoActual = CAMPOS.find(c => estado[c] == null) || null;

  // 3) YA TERMINÓ -> cierre (sin repetirlo si ya se mandó)
  if (!campoActual) {
    if (/registrado tu postulaci/i.test(ultimoBot)) {
      return empaquetar('¡Con gusto! Que tengas excelente día 😊', {}, info?.estatus || 'Nuevo', estado.vacante_cedis);
    }
    const estatus = clasificar(estado);
    return empaquetar(cierreTexto(estado.nombre_completo), {}, estatus, estado.vacante_cedis);
  }

  // 4) PROCESAR la respuesta a campoActual (con sus pasos)
  const extraccion: any = {};
  let seguimiento: string | null = null;
  let preamble = '';

  if (SALUD_DETALLE.has(campoActual)) {
    if (ultimoBot === FU_CUALES) {
      extraccion[campoActual] = String(mensajeUsuario).trim();
    } else if (esNegativo(mensajeUsuario) && !esAfirmativo(mensajeUsuario)) {
      extraccion[campoActual] = 'Ninguna';
    } else if (esSoloAfirmativo(mensajeUsuario)) {
      preamble = 'Gracias por compartirlo, lo tomo en cuenta. ';
      seguimiento = FU_CUALES;
    } else {
      extraccion[campoActual] = String(mensajeUsuario).trim();
    }
  }
  else if (campoActual === 'tiene_botas_casquillo') {
    if (ultimoBot === FU_BOTAS) {
      extraccion.tiene_botas_casquillo = false;
    } else if (esAfirmativo(mensajeUsuario)) {
      extraccion.tiene_botas_casquillo = true;
    } else {
      seguimiento = FU_BOTAS;
    }
  }
  else if (campoActual === 'credito_infonavit_fonacot') {
    if (ultimoBot === FU_INFONAVIT) {
      // El ultimoUser fue cuál crédito (Infonavit/Fonacot); este mensaje es la hoja
      extraccion.credito_infonavit_fonacot = `Sí (${ultimoUser}). Hoja de retenciones: ${String(mensajeUsuario).trim()}`;
    } else if (ultimoBot === FU_CUAL_CREDITO) {
      seguimiento = FU_INFONAVIT; // ya dijo cuál, ahora pedir la hoja
    } else if (esAfirmativo(mensajeUsuario) && !esNegativo(mensajeUsuario)) {
      seguimiento = FU_CUAL_CREDITO; // dijo sí, preguntar cuál de los dos
    } else {
      extraccion.credito_infonavit_fonacot = 'No';
    }
  }
  else if (campoActual === 'referidos_familiares_nombres') {
    if (ultimoBot === FU_REF_NOMBRE) {
      extraccion.referidos_familiares_nombres = String(mensajeUsuario).trim(); // es el nombre
    } else if (esNegativo(mensajeUsuario)) {
      extraccion.referidos_familiares_nombres = 'Sin referido';
    } else if (esSoloAfirmativo(mensajeUsuario)) {
      seguimiento = FU_REF_NOMBRE; // dijo sí, pedir nombre
    } else {
      extraccion.referidos_familiares_nombres = String(mensajeUsuario).trim(); // dio el nombre directo
    }
  }
  else if (campoActual === 'cuenta_banco_santander_problemas') {
    if (ultimoBot === FU_BANCO3) {
      extraccion.cuenta_banco_santander_problemas = 'Problema con Santander: ' + String(mensajeUsuario).trim();
    } else if (ultimoBot === FU_BANCO2) {
      if (/adeudo|bloqueo|aclaracion/.test(norm(mensajeUsuario))) {
        extraccion.cuenta_banco_santander_problemas = 'Problema con Santander: ' + String(mensajeUsuario).trim();
      } else if (esAfirmativo(mensajeUsuario)) {
        seguimiento = FU_BANCO3; // sí tuvo, preguntar cuál
      } else {
        extraccion.cuenta_banco_santander_problemas = 'Sin incidencias con Santander';
      }
    } else if (norm(mensajeUsuario).includes('santander')) {
      extraccion.cuenta_banco_santander_problemas = 'Ya cuenta con Santander';
    } else {
      seguimiento = FU_BANCO2; // banco distinto, preguntar por adeudos
    }
  }
  else if (campoActual === 'dependientes_economicos') {
    if (esNegativo(mensajeUsuario) || soloEntero(mensajeUsuario) === 0) {
      extraccion.dependientes_economicos = 0;
      extraccion.apoyo_cuidado_dependientes = 'No aplica';
    } else {
      const n = soloEntero(mensajeUsuario);
      extraccion.dependientes_economicos = n === null ? 1 : n;
    }
  }
  else {
    extraccion[campoActual] = await extraer(apiKey, campoActual, mensajeUsuario);
  }

  // 5) Si hay seguimiento, lo mandamos y NO avanzamos
  if (seguimiento) {
    return empaquetar(preamble + seguimiento, extraccion, info?.estatus || 'Nuevo', estado.vacante_cedis);
  }

  // 6) Estado nuevo + CEDIS + próxima pregunta
  const estadoNuevo: any = { ...estado, ...extraccion };
  if (estadoNuevo.dependientes_economicos === 0 && estadoNuevo.apoyo_cuidado_dependientes == null) {
    estadoNuevo.apoyo_cuidado_dependientes = 'No aplica';
  }
  const cedis = estadoNuevo.vacante_cedis || detectarCedis(estadoNuevo.zona_vivienda) || detectarCedis(mensajeUsuario) || null;
  estadoNuevo.vacante_cedis = cedis;

  const proximo = CAMPOS.find(c => estadoNuevo[c] == null) || null;

  if (!preamble) {
    if (extraccion.nombre_completo) preamble = `¡Mucho gusto, ${extraccion.nombre_completo}! `;
    else if (campoActual === 'experiencia_almacen_meses' && estadoNuevo.experiencia_almacen_meses === 0) preamble = '¡No hay problema, todos empezamos algún día! 😊 ';
    else if (SALUD_DETALLE.has(campoActual) && extraccion[campoActual] && extraccion[campoActual] !== 'Ninguna') preamble = 'Gracias por compartirlo, lo tomo en cuenta. ';
  }

  // 7) ¿Terminó?
  if (!proximo) {
    const estatus = clasificar(estadoNuevo);
    return empaquetar(cierreTexto(estadoNuevo.nombre_completo), extraccion, estatus, cedis);
  }

  // 8) Próxima pregunta
  const pregunta = preamble + textoPregunta(proximo, cedis);
  return empaquetar(pregunta, extraccion, info?.estatus || 'Nuevo', cedis);
};