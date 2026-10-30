import { supabase } from './supabase';

/* ══════════════════════════════════════════════════════════════
   ARIS · Cerebro de entrevista
   • El CÓDIGO escribe cada pregunta y controla el flujo.
   • El sí/no y los números los entiende el código; la IA ayuda
     en los casos raros.
   • REGLA NUEVA: si no se entiende una respuesta válida, ARIS
     VUELVE A PREGUNTAR (no guarda valores inventados).
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
  dependientes_economicos: '¿Tienes dependientes económicos a tu cargo?',
  apoyo_cuidado_dependientes: '¿Cuentas con apoyo para el cuidado de tus dependientes mientras trabajas?',
  tiempo_traslado_minutos: '¿Cuánto tiempo te tomaría trasladarte al almacén, en minutos aproximadamente?',
  inconveniente_traslado: '¿Tienes algún inconveniente para trasladarte al trabajo?',
  escolaridad_comprobable: '¿Cuál es tu nivel de escolaridad comprobable?',
  experiencia_almacen_meses: '¿Cuántos meses de experiencia tienes en almacén? (Si no tienes, dime "ninguna")',
  areas_desempenadas: '¿En qué áreas o trabajos te has desempeñado? (Si es tu primer empleo, dime "ninguno")',
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

// Textos de seguimiento (el código los manda TAL CUAL).
const FU_CUALES       = '¿Cuáles? Cuéntame un poco para dejarlo registrado. 📝';
const FU_BOTAS        = '¿Podrías conseguirlas antes de ingresar? 👢';
const FU_DEP_CUANTOS  = '¿Cuántos dependientes económicos tienes a tu cargo?';
const FU_CUAL_CREDITO = '¿Cuál de los dos: Infonavit o Fonacot?';
const FU_INFONAVIT    = 'Para el expediente necesitaremos tu hoja de retenciones actualizada 📄 ¿La tienes o puedes conseguirla?';
const FU_REF_NOMBRE   = '¡Qué bien! ¿Cuál es su nombre completo?';
const FU_DOC          = 'Sin problema 😊 ¿Puedes conseguir o completar lo que te falta antes de ingresar?';
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

/* ── Normalizadores de SÍ / NO ── */
const norm = (s: any = ''): string => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const esNegativo = (txt: any): boolean => {
  const s = norm(txt);
  const c = s.replace(/[^a-z]/g, '');
  if (['no', 'nel', 'nop', 'nou', 'nain', 'nada', 'cero', 'ninguna', 'ninguno', 'ningun', 'nunca', 'jamas', 'negativo'].includes(c)) return true;
  return /\b(no|nel|nop|nunca|jamas|ninguna|ninguno|ningun|nada|negativo|no tengo|no cuento|no puedo)\b/.test(s);
};

const esAfirmativo = (txt: any): boolean => {
  if (esNegativo(txt)) return false; // el "no" siempre gana
  const s = norm(txt);
  const c = s.replace(/[^a-z]/g, '');
  if (/^s+i+$/.test(c)) return true;
  if (['si', 'sip', 'sipi', 'simon', 'sale', 'va', 'dale', 'claro', 'obvio', 'correcto', 'afirmativo', 'exacto', 'porsupuesto', 'asies', 'sisi', 'siclaro'].includes(c)) return true;
  return /\b(si|claro|obvio|correcto|afirmativo|sale|simon|por supuesto|asi es|tengo|si tengo|cuento con|puedo|ya la tengo|ya lo tengo)\b/.test(s);
};

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

const detectarTurno = (txt: any): string | null => {
  const s = norm(txt);
  if (/matut|manana|maniana|6am|8am/.test(s)) return 'Matutino';
  if (/vesper|tarde|1pm|11am/.test(s)) return 'Vespertino';
  if (/noct|noche|10pm/.test(s)) return 'Nocturno';
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

/* ── IA de apoyo (casos raros) ── */
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

async function iaTurno(apiKey: string, mensajeUsuario: string): Promise<string | null> {
  if (!apiKey) return null;
  const sys = `El candidato eligió un turno de trabajo. Responde SOLO JSON {"valor": X} donde X es "Matutino", "Vespertino", "Nocturno" o null si no lo menciona.`;
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
    const v = JSON.parse(t)?.valor;
    return ['Matutino', 'Vespertino', 'Nocturno'].includes(v) ? v : null;
  } catch { return null; }
}

/* ── Procesa un campo simple: devuelve {valor} o {reask} ── */
async function procesarCampo(apiKey: string, campo: string, msg: any): Promise<{ valor?: any, reask?: string }> {
  const texto = String(msg).trim();

  if (campo === 'nombre_completo') {
    const nom = limpiarNombre(msg);
    if (nom.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ]/g, '').length < 2) return { reask: 'Perdona, no te entendí. ¿Me compartes tu nombre completo? 🙏' };
    return { valor: nom };
  }

  if (campo === 'turno_preferido') {
    const t = detectarTurno(msg) || await iaTurno(apiKey, msg);
    if (!t) return { reask: '¿Qué turno te gustaría: matutino, vespertino o nocturno?' };
    return { valor: t };
  }

  if (INT.has(campo)) {
    let n = soloEntero(msg);
    if (n === null) {
      const ia = await iaExtrae(apiKey, campo, msg);
      if (typeof ia === 'number') n = ia;
      else if (ia != null && !isNaN(parseInt(String(ia), 10))) n = parseInt(String(ia), 10);
    }
    if (campo === 'edad') {
      if (n === null || n < 15 || n > 70) return { reask: 'Necesito tu edad en número, por favor. Por ejemplo: 25' };
    } else if (campo === 'nivel_salud_percecion') {
      if (n === null || n < 1 || n > 10) return { reask: 'Del 1 al 10, ¿qué número le das a tu estado de salud?' };
    } else if (campo === 'tiempo_traslado_minutos') {
      if (n === null || n < 0) return { reask: '¿Cuántos minutos te tomaría llegar, aproximadamente? Dame un número.' };
    } else {
      if (n === null) n = 0; // experiencia: si no dice número, 0
    }
    return { valor: n };
  }

  if (BOOL.has(campo)) {
    if (esAfirmativo(msg)) return { valor: true };
    if (esNegativo(msg)) return { valor: false };
    const ia = await iaExtrae(apiKey, campo, msg);
    if (ia === true || ia === 'true') return { valor: true };
    if (ia === false || ia === 'false') return { valor: false };
    return { reask: 'Perdona, ¿me confirmas con un sí o un no? 🙏' };
  }

  // texto libre
  if (!texto) return { reask: '¿Me lo confirmas, por favor?' };
  return { valor: texto };
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

  // 3) YA TERMINÓ -> cierre (sin repetirlo)
  if (!campoActual) {
    if (/registrado tu postulaci/i.test(ultimoBot)) {
      return empaquetar('¡Con gusto! Que tengas excelente día 😊', {}, info?.estatus || 'Nuevo', estado.vacante_cedis);
    }
    const estatus = clasificar(estado);
    return empaquetar(cierreTexto(estado.nombre_completo), {}, estatus, estado.vacante_cedis);
  }

  // 4) PROCESAR respuesta
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
  else if (campoActual === 'dependientes_economicos') {
    if (ultimoBot === FU_DEP_CUANTOS) {
      const n = soloEntero(mensajeUsuario);
      if (n === null) seguimiento = FU_DEP_CUANTOS; // repetir hasta número
      else { extraccion.dependientes_economicos = n; if (n === 0) extraccion.apoyo_cuidado_dependientes = 'No aplica'; }
    } else if (esNegativo(mensajeUsuario) || soloEntero(mensajeUsuario) === 0) {
      extraccion.dependientes_economicos = 0;
      extraccion.apoyo_cuidado_dependientes = 'No aplica';
    } else {
      const n = soloEntero(mensajeUsuario);
      if (n !== null) extraccion.dependientes_economicos = n;
      else seguimiento = FU_DEP_CUANTOS; // dijo "sí" sin número -> preguntar cuántos
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
      extraccion.credito_infonavit_fonacot = `Sí (${ultimoUser}). Hoja de retenciones: ${String(mensajeUsuario).trim()}`;
    } else if (ultimoBot === FU_CUAL_CREDITO) {
      seguimiento = FU_INFONAVIT;
    } else if (esAfirmativo(mensajeUsuario) && !esNegativo(mensajeUsuario)) {
      seguimiento = FU_CUAL_CREDITO;
    } else {
      extraccion.credito_infonavit_fonacot = 'No';
    }
  }
  else if (campoActual === 'documentacion_completa_original') {
    if (ultimoBot === FU_DOC) {
      extraccion.documentacion_completa_original = esAfirmativo(mensajeUsuario); // true si puede completarla
      preamble = '¡Perfecto! Lo registramos. ';
    } else if (esAfirmativo(mensajeUsuario) && !esNegativo(mensajeUsuario)) {
      extraccion.documentacion_completa_original = true;
    } else {
      seguimiento = FU_DOC; // le falta algo -> ¿puede conseguirlo?
    }
  }
  else if (campoActual === 'areas_desempenadas') {
    const s = norm(mensajeUsuario);
    if (esNegativo(mensajeUsuario) || /ningun|primer empleo|sin experiencia|nunca he trabajado|no he trabajado/.test(s)) {
      extraccion.areas_desempenadas = 'Sin experiencia previa';
      extraccion.motivo_salida_anterior = 'Sin empleo anterior'; // se salta la de motivo
    } else {
      extraccion.areas_desempenadas = String(mensajeUsuario).trim();
    }
  }
  else if (campoActual === 'referidos_familiares_nombres') {
    if (ultimoBot === FU_REF_NOMBRE) {
      extraccion.referidos_familiares_nombres = String(mensajeUsuario).trim();
    } else if (esNegativo(mensajeUsuario)) {
      extraccion.referidos_familiares_nombres = 'Sin referido';
    } else if (esSoloAfirmativo(mensajeUsuario)) {
      seguimiento = FU_REF_NOMBRE;
    } else {
      extraccion.referidos_familiares_nombres = String(mensajeUsuario).trim();
    }
  }
  else if (campoActual === 'cuenta_banco_santander_problemas') {
    if (ultimoBot === FU_BANCO3) {
      extraccion.cuenta_banco_santander_problemas = 'Problema con Santander: ' + String(mensajeUsuario).trim();
    } else if (ultimoBot === FU_BANCO2) {
      if (/adeudo|bloqueo|aclaracion/.test(norm(mensajeUsuario))) {
        extraccion.cuenta_banco_santander_problemas = 'Problema con Santander: ' + String(mensajeUsuario).trim();
      } else if (esAfirmativo(mensajeUsuario)) {
        seguimiento = FU_BANCO3;
      } else {
        extraccion.cuenta_banco_santander_problemas = 'Sin incidencias con Santander';
      }
    } else if (norm(mensajeUsuario).includes('santander')) {
      extraccion.cuenta_banco_santander_problemas = 'Ya cuenta con Santander';
    } else {
      seguimiento = FU_BANCO2;
    }
  }
  else {
    // Campos simples con validación + re-pregunta
    const r = await procesarCampo(apiKey, campoActual, mensajeUsuario);
    if (r.reask) seguimiento = r.reask;
    else extraccion[campoActual] = r.valor;
  }

  // 5) Si hay seguimiento/re-pregunta, lo mandamos y NO avanzamos
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