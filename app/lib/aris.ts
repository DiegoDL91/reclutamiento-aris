import { supabase } from './supabase';

/* ══════════════════════════════════════════════════════════════
   ARIS · Cerebro de entrevista — PLAN B (IA interpreta, código controla)
   • Cada mensaje lo INTERPRETA la IA (typos, informal, correcciones).
   • El CÓDIGO manda el flujo, los textos exactos y la clasificación.
   • Si la IA falla o no hay saldo → red de respaldo con reglas.
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

const Q_UBICACION     = 'Trabajamos en dos ubicaciones: Azcapotzalco (CDMX) y Cuautitlán Izcalli (EdoMex) 📍 ¿A cuál te queda mejor acudir?';
const FU_CUALES       = '¿Cuáles? Cuéntame un poco para dejarlo registrado. 📝';
const FU_BOTAS        = '¿Podrías conseguirlas antes de ingresar? 👢';
const FU_DEP_CUANTOS  = '¿Cuántos dependientes económicos tienes a tu cargo? (Si no tienes, dime "ninguno")';
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

/* ── Helpers de respaldo (si la IA falla) ── */
const norm = (s: any = ''): string => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const esNegativo = (txt: any): boolean => {
  const s = norm(txt); const c = s.replace(/[^a-z]/g, '');
  if (['no','nel','nop','nou','nain','nada','cero','ninguna','ninguno','ningun','inguno','nunca','jamas','negativo'].includes(c)) return true;
  return /\b(no|nel|nop|nunca|jamas|ninguna|ninguno|ningun|nada|negativo|no tengo|no cuento|no puedo)\b/.test(s);
};
const esAfirmativo = (txt: any): boolean => {
  if (esNegativo(txt)) return false;
  const s = norm(txt); const c = s.replace(/[^a-z]/g, '');
  if (/^s+i+$/.test(c)) return true;
  if (['si','is','sip','sipi','simon','sale','va','dale','claro','obvio','correcto','afirmativo','exacto','porsupuesto','asies','sisi','siclaro'].includes(c)) return true;
  return /\b(si|claro|obvio|correcto|afirmativo|sale|simon|por supuesto|asi es|tengo|si tengo|cuento con|puedo)\b/.test(s);
};
const esSoloAfirmativo = (txt: any): boolean => {
  if (!esAfirmativo(txt)) return false;
  const resto = norm(txt).replace(/\b(si|claro|obvio|correcto|afirmativo|sale|simon|por supuesto|asi es|tengo|si tengo|pues|la verdad|de hecho|creo que|una|un|algo|algunas?|algunos?)\b/g,'').replace(/[^a-z]/g,'');
  return resto.length <= 2;
};
const sinExperiencia = (txt: any): boolean => /n?ingun|sin experiencia|no he trabaj|nunca he trabaj|primer empleo|es mi primer|no tengo experiencia|te dije que no/.test(norm(txt));
const quiereSalir = (txt: any): boolean => { const s = norm(txt); return ['adios','hasta luego','no me interesa','ya no me interesa','mejor no','ya no quiero','no gracias'].some(f => s === f || s === f + '.'); };
const detectarCedis = (txt: any): string | null => { const z = norm(txt); if (/azcapotzalco|rosario|vallejo|cdmx|ciudad de m|popotla|claveria/.test(z)) return 'Editorial'; if (/cuautitl|izcalli|sabino|edomex|estado de m|tultitl|tultepec|coacalco|tlalnepantla/.test(z)) return 'UPS'; return null; };
const detectarTurno = (txt: any): string | null => { const s = norm(txt); if (/matut|manana|maniana|6am|8am/.test(s)) return 'Matutino'; if (/vesper|tarde|1pm|11am/.test(s)) return 'Vespertino'; if (/noct|noche|10pm/.test(s)) return 'Nocturno'; return null; };
const soloEntero = (txt: any): number | null => { const s = norm(txt); if (/ningun|nada|cero|sin experiencia|^no$/.test(s)) return 0; const m = s.match(/\d+/); return m ? parseInt(m[0],10) : null; };
const limpiarNombre = (t: any): string => String(t).replace(/^\s*(hola,?\s*)?(me llamo|mi nombre es|soy)\s+/i, '').trim();

/* ── INTÉRPRETE (IA) ── */
type Interp = { intencion: string; si_no: string | null; numero: number | null; turno: string | null; texto: string; correccion_campo: string | null; correccion_valor: any };

async function interpretar(apiKey: string, preguntaActual: string, historialReciente: any[], msg: any): Promise<Interp> {
  const fallback: Interp = {
    intencion: quiereSalir(msg) ? 'salir' : 'responder',
    si_no: esAfirmativo(msg) ? 'si' : (esNegativo(msg) ? 'no' : null),
    numero: soloEntero(msg),
    turno: detectarTurno(msg),
    texto: String(msg).trim(),
    correccion_campo: null, correccion_valor: null
  };
  if (!apiKey) return fallback;

  const sys = `Eres el intérprete de una entrevista de reclutamiento por WhatsApp para Rio Logística.
ARIS acaba de preguntar: "${preguntaActual}".
El candidato puede responder con faltas de ortografía, abreviaturas, de forma informal o en pedazos. Interpreta su mensaje y responde SOLO con este JSON:
{
 "intencion": "responder" | "corregir" | "salir" | "confuso",
 "si_no": "si" | "no" | null,
 "numero": <entero> | null,
 "turno": "Matutino" | "Vespertino" | "Nocturno" | null,
 "texto": "<la respuesta del candidato, en texto limpio y bien escrito>",
 "correccion_campo": null | "<uno de: ${CAMPOS.join(', ')}>",
 "correccion_valor": null | <valor nuevo>
}
Reglas:
- "si_no": solo si la respuesta es claramente afirmativa o negativa a lo que se le preguntó.
- "numero": extrae la cantidad si mencionó una (edad, minutos, cuántos dependientes, etc.).
- "turno": solo si eligió un turno de trabajo.
- "intencion":"corregir" SOLO si pide claramente cambiar un dato que ya había dado (indica el campo y el nuevo valor).
- "intencion":"salir" si ya no le interesa la vacante.
- Nunca inventes datos que el candidato no haya dado.`;

  try {
    const mensajes = [{ role: 'system', content: sys }, ...historialReciente, { role: 'user', content: String(msg) }];
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', temperature: 0, response_format: { type: 'json_object' }, messages: mensajes })
    });
    const d = await r.json();
    const t = d?.choices?.[0]?.message?.content;
    if (!t) return fallback;
    const p = JSON.parse(t);
    return {
      intencion: ['responder','corregir','salir','confuso'].includes(p.intencion) ? p.intencion : 'responder',
      si_no: (p.si_no === 'si' || p.si_no === 'no') ? p.si_no : null,
      numero: (typeof p.numero === 'number') ? Math.round(p.numero) : (p.numero != null && !isNaN(parseInt(String(p.numero),10)) ? parseInt(String(p.numero),10) : null),
      turno: ['Matutino','Vespertino','Nocturno'].includes(p.turno) ? p.turno : null,
      texto: (typeof p.texto === 'string' && p.texto.trim()) ? p.texto.trim() : String(msg).trim(),
      correccion_campo: CAMPOS.includes(p.correccion_campo) ? p.correccion_campo : null,
      correccion_valor: p.correccion_valor ?? null
    };
  } catch { return fallback; }
}

/* ── Campos simples (usa la interpretación, sin más llamadas) ── */
function procesarSimple(campo: string, I: Interp, msgRaw: any): { valor?: any, reask?: string } {
  if (campo === 'nombre_completo') {
    const nom = limpiarNombre(I.texto || msgRaw);
    if (nom.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ]/g, '').length < 2) return { reask: 'Perdona, no te entendí. ¿Me compartes tu nombre completo? 🙏' };
    return { valor: nom };
  }
  if (campo === 'turno_preferido') {
    if (I.turno) return { valor: I.turno };
    return { reask: '¿Qué turno te gustaría: matutino, vespertino o nocturno?' };
  }
  if (campo === 'escolaridad_comprobable') {
    if (I.si_no === 'no' && I.numero === null) return { valor: 'Sin escolaridad comprobable' };
    return { valor: I.texto || String(msgRaw).trim() };
  }
  if (INT.has(campo)) {
    const n = I.numero;
    if (campo === 'edad') {
      if (n === null) return { reask: 'Dame tu edad en número, por favor. Por ejemplo: 25' };
      if (n < 14 || n > 75) return { reask: 'Esa edad no parece válida 🤔 ¿Me confirmas tu edad en número?' };
    } else if (campo === 'nivel_salud_percecion') {
      if (n === null || n < 1 || n > 10) return { reask: 'Del 1 al 10, ¿qué número le das a tu estado de salud?' };
    } else if (campo === 'tiempo_traslado_minutos') {
      if (n === null || n < 0) return { reask: '¿Cuántos minutos te tomaría llegar, aproximadamente? Dame un número.' };
    } else {
      return { valor: n === null ? 0 : n };
    }
    return { valor: n };
  }
  if (BOOL.has(campo)) {
    if (I.si_no === 'si') return { valor: true };
    if (I.si_no === 'no') return { valor: false };
    return { reask: 'Perdona, ¿me confirmas con un sí o un no? 🙏' };
  }
  const t = I.texto || String(msgRaw).trim();
  if (!t) return { reask: '¿Me lo confirmas, por favor?' };
  return { valor: t };
}

function vacante(cedis: string | null): string {
  if (cedis === 'Editorial') return `Tenemos una vacante de Auxiliar de Almacén en Azcapotzalco, CDMX 📦\n\n💰 Sueldo de $2,205 + bono de $195 por puntualidad. Prestaciones de ley.\n\n🕐 Turnos disponibles:\n• Matutino: 6am - 4pm\n• Vespertino: 1pm - 10pm\n• Nocturno: 10pm - 7am\n\n¿Te interesa? ¿Qué turno te gustaría?`;
  if (cedis === 'UPS') return `Tenemos una vacante de Auxiliar de Almacén en El Sabino, Cuautitlán Izcalli 📦\n\n💰 Sueldo de $2,205 + bono de $296 por puntualidad. Prestaciones de ley.\n\n🕐 Turnos disponibles:\n• Matutino: 8am - 6pm\n• Vespertino: 11am - 10pm\n• Nocturno: 10pm - 6am\n\n¿Te interesa? ¿Qué turno te gustaría?`;
  return Q_UBICACION;
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

/* ══════════════════════════════════════════════════════════════ */
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

  // 1) PRIMER CONTACTO (sin IA)
  if (!yaSaludo) {
    const saludo = '¡Hola! 👋 Soy A.R.I.S., el sistema de inteligencia artificial de reclutamiento de Rio Logística.\n\nEstoy aquí para acompañarte en tu proceso de selección de forma rápida y personalizada 🚀\n\n¿Cuál es tu nombre completo?';
    return empaquetar(saludo, {}, 'Nuevo', estado.vacante_cedis);
  }

  // 2) INTERPRETAR el mensaje con la IA
  const I = await interpretar(apiKey, ultimoBot, historial.slice(-6), mensajeUsuario);

  // 3) SALIDA
  if (I.intencion === 'salir') {
    const despedida = 'Sin problema, fue un gusto. Si en el futuro te interesa, aquí estaremos. ¡Que tengas excelente día! 😊';
    return empaquetar(despedida, {}, info?.estatus || 'Nuevo', estado.vacante_cedis);
  }

  const campoActual = CAMPOS.find(c => estado[c] == null) || null;

  // 4) YA TERMINÓ -> cierre
  if (!campoActual) {
    if (/registrado tu postulaci/i.test(ultimoBot)) {
      return empaquetar('¡Con gusto! Que tengas excelente día 😊', {}, info?.estatus || 'Nuevo', estado.vacante_cedis);
    }
    const estatus = clasificar(estado);
    return empaquetar(cierreTexto(estado.nombre_completo), {}, estatus, estado.vacante_cedis);
  }

  // 5) CORRECCIÓN de un dato previo
  if (I.intencion === 'corregir' && I.correccion_campo && I.correccion_valor != null) {
    const extra: any = {}; extra[I.correccion_campo] = I.correccion_valor;
    const reask = `Listo, ya lo corregí 👍\n\n${ultimoBot || textoPregunta(campoActual, estado.vacante_cedis)}`;
    return empaquetar(reask, extra, info?.estatus || 'Nuevo', estado.vacante_cedis);
  }

  // 6) PROCESAR el campo actual
  const extraccion: any = {};
  let seguimiento: string | null = null;
  let preamble = '';

  if (campoActual === 'zona_vivienda') {
    if (detectarCedis(I.texto) || detectarCedis(mensajeUsuario)) extraccion.zona_vivienda = (I.texto || String(mensajeUsuario)).trim();
    else seguimiento = Q_UBICACION;
  }
  else if (SALUD_DETALLE.has(campoActual)) {
    if (ultimoBot === FU_CUALES) extraccion[campoActual] = I.texto;
    else if (I.si_no === 'no') extraccion[campoActual] = 'Ninguna';
    else if (I.si_no === 'si' && esSoloAfirmativo(mensajeUsuario)) { preamble = 'Gracias por compartirlo, lo tomo en cuenta. '; seguimiento = FU_CUALES; }
    else extraccion[campoActual] = I.texto;
  }
  else if (campoActual === 'dependientes_economicos') {
    if (ultimoBot === FU_DEP_CUANTOS) {
      if (I.si_no === 'no') { extraccion.dependientes_economicos = 0; extraccion.apoyo_cuidado_dependientes = 'No aplica'; }
      else if (I.numero != null) { extraccion.dependientes_economicos = I.numero; if (I.numero === 0) extraccion.apoyo_cuidado_dependientes = 'No aplica'; }
      else seguimiento = FU_DEP_CUANTOS;
    } else if (I.si_no === 'no' || I.numero === 0) { extraccion.dependientes_economicos = 0; extraccion.apoyo_cuidado_dependientes = 'No aplica'; }
    else if (I.numero != null) extraccion.dependientes_economicos = I.numero;
    else seguimiento = FU_DEP_CUANTOS;
  }
  else if (campoActual === 'areas_desempenadas') {
    if (I.si_no === 'no' || sinExperiencia(I.texto) || sinExperiencia(mensajeUsuario)) {
      extraccion.areas_desempenadas = 'Sin experiencia previa';
      extraccion.motivo_salida_anterior = 'Sin empleo anterior';
      extraccion.tiene_constancias_laborales = false;
    } else extraccion.areas_desempenadas = I.texto;
  }
  else if (campoActual === 'motivo_salida_anterior') {
    if (sinExperiencia(I.texto) || sinExperiencia(mensajeUsuario)) { extraccion.motivo_salida_anterior = 'Sin empleo anterior'; extraccion.tiene_constancias_laborales = false; }
    else extraccion.motivo_salida_anterior = I.texto;
  }
  else if (campoActual === 'tiene_botas_casquillo') {
    if (ultimoBot === FU_BOTAS) extraccion.tiene_botas_casquillo = false;
    else if (I.si_no === 'si') extraccion.tiene_botas_casquillo = true;
    else seguimiento = FU_BOTAS;
  }
  else if (campoActual === 'credito_infonavit_fonacot') {
    if (ultimoBot === FU_INFONAVIT) extraccion.credito_infonavit_fonacot = `Sí (${ultimoUser}). Hoja de retenciones: ${I.texto}`;
    else if (ultimoBot === FU_CUAL_CREDITO) seguimiento = FU_INFONAVIT;
    else if (I.si_no === 'si') seguimiento = FU_CUAL_CREDITO;
    else extraccion.credito_infonavit_fonacot = 'No';
  }
  else if (campoActual === 'documentacion_completa_original') {
    if (ultimoBot === FU_DOC) { extraccion.documentacion_completa_original = (I.si_no === 'si'); preamble = '¡Perfecto! Lo registramos. '; }
    else if (I.si_no === 'si') extraccion.documentacion_completa_original = true;
    else seguimiento = FU_DOC;
  }
  else if (campoActual === 'referidos_familiares_nombres') {
    if (ultimoBot === FU_REF_NOMBRE) extraccion.referidos_familiares_nombres = I.texto;
    else if (I.si_no === 'no') extraccion.referidos_familiares_nombres = 'Sin referido';
    else if (I.si_no === 'si' && esSoloAfirmativo(mensajeUsuario)) seguimiento = FU_REF_NOMBRE;
    else extraccion.referidos_familiares_nombres = I.texto;
  }
  else if (campoActual === 'cuenta_banco_santander_problemas') {
    if (ultimoBot === FU_BANCO3) extraccion.cuenta_banco_santander_problemas = 'Problema con Santander: ' + I.texto;
    else if (ultimoBot === FU_BANCO2) {
      if (/adeudo|bloqueo|aclaracion/.test(norm(mensajeUsuario)) || /adeudo|bloqueo|aclaracion/.test(norm(I.texto))) extraccion.cuenta_banco_santander_problemas = 'Problema con Santander: ' + I.texto;
      else if (I.si_no === 'si') seguimiento = FU_BANCO3;
      else extraccion.cuenta_banco_santander_problemas = 'Sin incidencias con Santander';
    } else if (norm(I.texto).includes('santander') || norm(mensajeUsuario).includes('santander')) extraccion.cuenta_banco_santander_problemas = 'Ya cuenta con Santander';
    else seguimiento = FU_BANCO2;
  }
  else {
    const r = procesarSimple(campoActual, I, mensajeUsuario);
    if (r.reask) seguimiento = r.reask;
    else extraccion[campoActual] = r.valor;
  }

  // 7) Si hay seguimiento/re-pregunta
  if (seguimiento) {
    return empaquetar(preamble + seguimiento, extraccion, info?.estatus || 'Nuevo', estado.vacante_cedis);
  }

  // 8) Estado nuevo + CEDIS + próxima pregunta
  const estadoNuevo: any = { ...estado, ...extraccion };
  if (estadoNuevo.dependientes_economicos === 0 && estadoNuevo.apoyo_cuidado_dependientes == null) estadoNuevo.apoyo_cuidado_dependientes = 'No aplica';
  const cedis = estadoNuevo.vacante_cedis || detectarCedis(estadoNuevo.zona_vivienda) || detectarCedis(mensajeUsuario) || null;
  estadoNuevo.vacante_cedis = cedis;

  const proximo = CAMPOS.find(c => estadoNuevo[c] == null) || null;

  if (!preamble) {
    if (extraccion.nombre_completo) preamble = `¡Mucho gusto, ${extraccion.nombre_completo}! `;
    else if (campoActual === 'experiencia_almacen_meses' && estadoNuevo.experiencia_almacen_meses === 0) preamble = '¡No hay problema, todos empezamos algún día! 😊 ';
    else if (SALUD_DETALLE.has(campoActual) && extraccion[campoActual] && extraccion[campoActual] !== 'Ninguna') preamble = 'Gracias por compartirlo, lo tomo en cuenta. ';
  }

  if (!proximo) {
    const estatus = clasificar(estadoNuevo);
    return empaquetar(cierreTexto(estadoNuevo.nombre_completo), extraccion, estatus, cedis);
  }

  const pregunta = preamble + textoPregunta(proximo, cedis);
  return empaquetar(pregunta, extraccion, info?.estatus || 'Nuevo', cedis);
};