import { supabase } from './supabase';

/* ══════════════════════════════════════════════════════════════
   ARIS · Cerebro de entrevista — PLAN B
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
  estado_civil: '¿Cuál es tu estado civil?\n1️⃣ Soltero(a)   2️⃣ Casado(a)   3️⃣ Unión libre   4️⃣ Otro\n\nResponde con el número 👇',
  dependientes_economicos: '¿Tienes dependientes económicos a tu cargo?',
  apoyo_cuidado_dependientes: '¿Cuentas con apoyo para el cuidado de tus dependientes mientras trabajas?',
  tiempo_traslado_minutos: '¿Cuánto tiempo te tomaría trasladarte al almacén, en minutos aproximadamente?',
  inconveniente_traslado: '¿Tienes algún inconveniente para trasladarte al trabajo?',
  escolaridad_comprobable: '¿Cuál es tu nivel de escolaridad comprobable?\n1️⃣ Primaria   2️⃣ Secundaria   3️⃣ Preparatoria   4️⃣ Universidad   5️⃣ Otro\n\nResponde con el número 👇',
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

const Q_UBICACION     = 'Trabajamos en dos ubicaciones 📍\n1️⃣ Azcapotzalco (CDMX)\n2️⃣ Cuautitlán Izcalli (EdoMex)\n\n¿A cuál te queda mejor acudir? Responde 1 o 2 👇';
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
const Q_CORREGIR      = 'Con gusto lo corrijo 🙂 ¿Qué dato quieres cambiar? Escríbelo así: "mi edad es 25" o "mi turno es matutino".';
const CIERRE_MENOR    = 'Agradecemos mucho tu interés y el tiempo que te tomaste 🙏 Sin embargo, por disposición legal necesitamos que seas mayor de edad (18 años o más) para continuar, por lo que tu proceso ha concluido por ahora. Te deseamos mucho éxito. 😊';
const CIERRE_ZONA     = 'Entendido 🙏 Por ahora solo tenemos vacantes en Azcapotzalco (CDMX) y Cuautitlán Izcalli (EdoMex). Si más adelante puedes acudir a alguna, con gusto te atendemos. ¡Mucho éxito! 😊';

const OPC_ESTADO_CIVIL = ['Soltero(a)', 'Casado(a)', 'Unión libre', 'Otro'];
const OPC_ESCOLARIDAD  = ['Primaria', 'Secundaria', 'Preparatoria', 'Universidad', 'Otro'];

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

/* ── Helpers ── */
const norm = (s: any = ''): string => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const esNegativo = (txt: any): boolean => {
  const s = norm(txt); const c = s.replace(/[^a-z]/g, '');
  if (['no','nel','nop','nou','nain','nada','cero','ninguna','ninguno','ningun','inguno','nunca','jamas','negativo'].includes(c)) return true;
  return /\b(no|nel|nop|nunca|jamas|ninguna|ninguno|ningun|nada|negativo|no tengo|no cuento|no puedo|no he tenido|sin problema|sin incidencia)\b/.test(s);
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
const pareceSalida = (txt: any): boolean => { const s = norm(txt); if (['adios','hasta luego','no me interesa','ya no me interesa','mejor no','ya no quiero','no gracias'].some(f => s === f || s === f + '.')) return true; return /\b(ya no me interesa|no me interesa|ya no quiero|mejor ya no|me retiro|ya no deseo|olvidalo|dejalo asi|dejalo como esta)\b/.test(s); };
const pareceCorreccion = (txt: any): boolean => /\b(me equivoqu|equivoque|corrig|quise decir|queria decir)\b/.test(norm(txt));
const declinaZona = (txt: any): boolean => { const s = norm(txt); return esNegativo(txt) || /ningun|no puedo ir|no me queda|ninguna de las dos|a ninguna/.test(s); };
const detectarCedis = (txt: any): string | null => { const z = norm(txt); if (/azcapotzalco|rosario|vallejo|cdmx|ciudad de m|popotla|claveria/.test(z)) return 'Editorial'; if (/cuautitl|izcalli|sabino|edomex|estado de m|tultitl|tultepec|coacalco|tlalnepantla|coatitlan/.test(z)) return 'UPS'; return null; };
const detectarTurno = (txt: any): string | null => { const s = norm(txt); if (/matut|manana|maniana|6am|7am|8am/.test(s)) return 'Matutino'; if (/vesper|tarde|1pm|11am/.test(s)) return 'Vespertino'; if (/noct|noche|10pm/.test(s)) return 'Nocturno'; return null; };
const soloEntero = (txt: any): number | null => { const s = norm(txt); if (/ningun|nada|cero|sin experiencia|^no$/.test(s)) return 0; const m = s.match(/\d+/); return m ? parseInt(m[0],10) : null; };
const soloDigito = (txt: any): number | null => { const m = norm(txt).match(/\d+/); return m ? parseInt(m[0],10) : null; };
const limpiarNombre = (t: any): string => String(t).replace(/^\s*(hola,?\s*)?(me llamo|mi nombre es|soy)\s+/i, '').trim();

/* ── INTÉRPRETE (IA) ── */
type Interp = { intencion: string; si_no: string | null; numero: number | null; turno: string | null; texto: string; correccion_campo: string | null; correccion_valor: any };

async function interpretar(apiKey: string, preguntaActual: string, historialReciente: any[], msg: any): Promise<Interp> {
  const fallback: Interp = {
    intencion: 'responder',
    si_no: esAfirmativo(msg) ? 'si' : (esNegativo(msg) ? 'no' : null),
    numero: soloEntero(msg), turno: detectarTurno(msg), texto: String(msg).trim(),
    correccion_campo: null, correccion_valor: null
  };
  if (!apiKey) return fallback;
  const sys = `Eres el intérprete de una entrevista de reclutamiento por WhatsApp para Rio Logística.
ARIS acaba de preguntar: "${preguntaActual}".
El candidato puede responder con faltas de ortografía, abreviaturas, de forma informal, con un número de opción o en pedazos. Interpreta su mensaje y responde SOLO con este JSON:
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
- "si_no": solo si la respuesta es claramente afirmativa o negativa a lo que se le preguntó. Un "No" a "¿has tenido algún problema?" es "no".
- "numero": extrae la cantidad o el número de opción si mencionó uno.
- "turno": solo si eligió un turno de trabajo.
- Si el candidato dice qué dato quiere cambiar y a qué valor (ej. "mi edad es 25"), pon "correccion_campo" y "correccion_valor".
- Nunca inventes datos que el candidato no haya dado, ni repitas las palabras de la pregunta en "texto".`;
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

function procesarSimple(campo: string, I: Interp, msgRaw: any): { valor?: any, reask?: string } {
  if (campo === 'nombre_completo') {
    const nom = limpiarNombre(I.texto || msgRaw);
    if (nom.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ]/g, '').length < 2) return { reask: 'Perdona, no te entendí. ¿Me compartes tu nombre completo? 🙏' };
    return { valor: nom };
  }
  if (campo === 'turno_preferido') {
    if (I.turno) return { valor: I.turno };
    const n = soloDigito(msgRaw);
    if (n === 1) return { valor: 'Matutino' };
    if (n === 2) return { valor: 'Vespertino' };
    if (n === 3) return { valor: 'Nocturno' };
    return { reask: 'Responde con el número de tu turno: 1 (Matutino), 2 (Vespertino) o 3 (Nocturno) 👇' };
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
    } else { return { valor: n === null ? 0 : n }; }
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
  if (cedis === 'Editorial') return `Tenemos una vacante de Auxiliar de Almacén en Azcapotzalco, CDMX 📦\n\n💰 Sueldo de $2,205 + bono de $195 por puntualidad. Prestaciones de ley.\n\n🕐 Turnos disponibles:\n1️⃣ Matutino (7am - 4pm)\n2️⃣ Vespertino (1pm - 10pm)\n3️⃣ Nocturno (10pm - 7am)\n\n¿Te interesa? Responde con el número de tu turno 👇`;
  if (cedis === 'UPS') return `Tenemos una vacante de Auxiliar de Almacén en El Sabino, Cuautitlán Izcalli 📦\n\n💰 Sueldo de $2,205 + bono de $295 por puntualidad. Prestaciones de ley.\n\n🕐 Turnos disponibles:\n1️⃣ Matutino (8am - 6pm)\n2️⃣ Vespertino (11am - 10pm)\n3️⃣ Nocturno (10pm - 6am)\n\n¿Te interesa? Responde con el número de tu turno 👇`;
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
  const esRechazo = vertigo || (botas === false && cedis === 'UPS') || (edad && edad < 18);
  const esPendiente = banco.includes('problema con santander') || banco.includes('adeudo') || banco.includes('bloqueo')
    || (botas === false && cedis !== 'UPS') || (edad && edad > 45);
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

  if (!yaSaludo) {
    const saludo = '¡Hola! 👋 Soy A.R.I.S., el sistema de inteligencia artificial de reclutamiento de Rio Logística.\n\nEstoy aquí para acompañarte en tu proceso de selección de forma rápida y personalizada 🚀\n\n¿Cuál es tu nombre completo?';
    return empaquetar(saludo, {}, 'Nuevo', estado.vacante_cedis);
  }

  if (estado.edad != null && Number(estado.edad) < 18) {
    return empaquetar(CIERRE_MENOR, {}, 'Rechazado', estado.vacante_cedis);
  }

  const I = await interpretar(apiKey, ultimoBot, historial.slice(-6), mensajeUsuario);
  const campoActual = CAMPOS.find(c => estado[c] == null) || null;

  if (!campoActual) {
    if (/registrado tu postulaci/i.test(ultimoBot)) {
      return empaquetar('¡Con gusto! Que tengas excelente día 😊', {}, info?.estatus || 'Nuevo', estado.vacante_cedis);
    }
    const estatus = clasificar(estado);
    return empaquetar(cierreTexto(estado.nombre_completo), {}, estatus, estado.vacante_cedis);
  }

  if (/que dato quieres cambiar/i.test(norm(ultimoBot))) {
    if (I.correccion_campo && I.correccion_valor != null) {
      const extra: any = {}; extra[I.correccion_campo] = I.correccion_valor;
      return empaquetar(`¡Listo, ya lo corregí! 👍\n\n${textoPregunta(campoActual, estado.vacante_cedis)}`, extra, info?.estatus || 'Nuevo', estado.vacante_cedis);
    }
    return empaquetar(`Perfecto, sigamos 🙂\n\n${textoPregunta(campoActual, estado.vacante_cedis)}`, {}, info?.estatus || 'Nuevo', estado.vacante_cedis);
  }

  if (pareceSalida(mensajeUsuario)) {
    return empaquetar('Sin problema, fue un gusto. Si en el futuro te interesa, aquí estaremos. ¡Que tengas excelente día! 😊', {}, info?.estatus || 'Nuevo', estado.vacante_cedis);
  }

  if (pareceCorreccion(mensajeUsuario)) {
    if (I.correccion_campo && I.correccion_valor != null && estado[I.correccion_campo] != null && I.correccion_campo !== campoActual) {
      const extra: any = {}; extra[I.correccion_campo] = I.correccion_valor;
      const q = (ultimoBot && !/contarme un poco mas/i.test(norm(ultimoBot))) ? ultimoBot : textoPregunta(campoActual, estado.vacante_cedis);
      return empaquetar(`Listo, ya lo corregí 👍\n\n${q}`, extra, info?.estatus || 'Nuevo', estado.vacante_cedis);
    }
    return empaquetar(Q_CORREGIR, {}, info?.estatus || 'Nuevo', estado.vacante_cedis);
  }

  const extraccion: any = {};
  let seguimiento: string | null = null;
  let preamble = '';

  if (campoActual === 'zona_vivienda') {
    if (ultimoBot === Q_UBICACION) {
      let elec = detectarCedis(I.texto) || detectarCedis(mensajeUsuario);
      const nUbi = soloDigito(mensajeUsuario);
      if (!elec && nUbi === 1) elec = 'Editorial';
      if (!elec && nUbi === 2) elec = 'UPS';
      if (elec === 'Editorial') extraccion.zona_vivienda = 'Azcapotzalco';
      else if (elec === 'UPS') extraccion.zona_vivienda = 'Cuautitlán Izcalli';
      else if (declinaZona(mensajeUsuario)) return empaquetar(CIERRE_ZONA, {}, info?.estatus || 'Nuevo', estado.vacante_cedis);
      else seguimiento = Q_UBICACION;
    } else {
      if (detectarCedis(I.texto) || detectarCedis(mensajeUsuario)) extraccion.zona_vivienda = (I.texto || String(mensajeUsuario)).trim();
      else seguimiento = Q_UBICACION;
    }
  }
  else if (campoActual === 'estado_civil') {
    const n = soloDigito(mensajeUsuario);
    if (n && n >= 1 && n <= 4) extraccion.estado_civil = OPC_ESTADO_CIVIL[n - 1];
    else extraccion.estado_civil = I.texto;
  }
  else if (campoActual === 'escolaridad_comprobable') {
    const n = soloDigito(mensajeUsuario);
    if (n && n >= 1 && n <= 5) extraccion.escolaridad_comprobable = OPC_ESCOLARIDAD[n - 1];
    else if (I.si_no === 'no') extraccion.escolaridad_comprobable = 'Sin escolaridad comprobable';
    else extraccion.escolaridad_comprobable = I.texto;
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
    const dicho = norm(mensajeUsuario);
    const cualDicho = /infonavit/.test(dicho) ? 'Infonavit' : (/fonacot/.test(dicho) ? 'Fonacot' : null);
    if (ultimoBot === FU_INFONAVIT) extraccion.credito_infonavit_fonacot = `Sí (${ultimoUser}). Hoja de retenciones: ${I.texto}`;
    else if (ultimoBot === FU_CUAL_CREDITO) seguimiento = FU_INFONAVIT;
    else if (cualDicho) seguimiento = FU_INFONAVIT;
    else if (I.si_no === 'si') seguimiento = FU_CUAL_CREDITO;
    else extraccion.credito_infonavit_fonacot = 'No';
  }
  else if (campoActual === 'documentacion_completa_original') {
    if (ultimoBot === FU_DOC) { extraccion.documentacion_completa_original = (I.si_no === 'si'); preamble = '¡Perfecto! Lo registramos. '; }
    else if (I.si_no === 'si') extraccion.documentacion_completa_original = true;
    else seguimiento = FU_DOC;
  }
  else if (campoActual === 'referidos_familiares_nombres') {
    if (ultimoBot === FU_REF_NOMBRE) {
      const nom = (I.texto || '').trim();
      if (nom.replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ]/g, '').length < 2) seguimiento = '¿Me compartes el nombre completo de quien te refirió? 🙏';
      else extraccion.referidos_familiares_nombres = nom;
    }
    else if (I.si_no === 'no') extraccion.referidos_familiares_nombres = 'Sin referido';
    else if (I.si_no === 'si' && esSoloAfirmativo(mensajeUsuario)) seguimiento = FU_REF_NOMBRE;
    else extraccion.referidos_familiares_nombres = I.texto;
  }
  else if (campoActual === 'cuenta_banco_santander_problemas') {
    const dicho = norm(mensajeUsuario);
    if (ultimoBot === FU_BANCO3) extraccion.cuenta_banco_santander_problemas = 'Problema con Santander: ' + I.texto;
    else if (ultimoBot === FU_BANCO2) {
      if (esNegativo(mensajeUsuario)) extraccion.cuenta_banco_santander_problemas = 'Sin incidencias con Santander';
      else if (/adeudo|bloqueo|aclaracion/.test(dicho)) extraccion.cuenta_banco_santander_problemas = 'Problema con Santander: ' + I.texto;
      else if (I.si_no === 'si') seguimiento = FU_BANCO3;
      else extraccion.cuenta_banco_santander_problemas = 'Sin incidencias con Santander';
    } else if (dicho.includes('santander')) extraccion.cuenta_banco_santander_problemas = 'Ya cuenta con Santander';
    else seguimiento = FU_BANCO2;
  }
  else {
    const r = procesarSimple(campoActual, I, mensajeUsuario);
    if (r.reask) seguimiento = r.reask;
    else extraccion[campoActual] = r.valor;
  }

  if (extraccion.edad != null && Number(extraccion.edad) < 18) {
    return empaquetar(CIERRE_MENOR, extraccion, 'Rechazado', estado.vacante_cedis);
  }

  if (seguimiento) {
    return empaquetar(preamble + seguimiento, extraccion, info?.estatus || 'Nuevo', estado.vacante_cedis);
  }

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