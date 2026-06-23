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
  const historialReciente = historialCompleto.slice(-6);

  const estado: any = {};
  CAMPOS.forEach(c => { estado[c] = (info?.[c] ?? null); });
  estado.vacante_cedis = info?.vacante_cedis ?? null;

  const camposNulos = CAMPOS.filter(c => estado[c] === null || estado[c] === undefined);
  const esPrimerContacto = !info || Object.values(estado).every(v => v === null);

  const systemPrompt = `Eres A.R.I.S., la IA de reclutamiento de Rio Logística. 

═══════════════════
TEXTOS OBLIGATORIOS (NO CAMBIAR NI UNA PALABRA):
═══════════════════
1. SALUDO INICIAL (Si no sabes el nombre):
"¡Hola! 👋 Soy A.R.I.S., el sistema de inteligencia artificial de reclutamiento de Rio Logística.

Estoy aquí para acompañarte en todo tu proceso de selección de forma rápida y personalizada 🚀

¿Cuál es tu nombre completo?"

2. CIERRE FINAL (Cuando todos los campos estén llenos):
"Muchas gracias por tu tiempo, ${estado.nombre_completo || '[nombre]'} 🙌 Ya registré toda tu información. Nuestro equipo de reclutamiento se pondrá en contacto contigo pronto. ¡Que tengas excelente día!"

═══════════════════
REGLAS DE EMPATÍA Y LÓGICA (PUNTOS 2 AL 6):
═══════════════════
- SEGUNDO MENSAJE: Siempre di "¡Gracias, [Nombre]! 😊" antes de pedir la edad.
- ACUSE DE RECIBO: Comenta brevemente la respuesta anterior. Si dice "Diabetes", di "Lamento escuchar eso, anotado para tomarlo en cuenta."
- PROFUNDIZACIÓN: Si dice "Sí" a salud/alergias sin especificar, pregunta "¿Cuáles exactamente?" antes de seguir.
- BOTAS: Si dice NO, pregunta "¿Para cuándo podrías conseguirlas?". Es indispensable.
- INFONAVIT: Si dice SÍ, pregunta "¿Podrás proporcionarme tu hoja de retenciones actualizada?".
- BANCO: Si es Santander di "¡Excelente! Eso agiliza tu pago.". Si es otro di "Apoyaremos con el trámite de una tarjeta de nómina.".

═══════════════════
ESTADO ACTUAL:
═══════════════════
${JSON.stringify(estado, null, 2)}

RESPONDE SOLO JSON:
{
  "pregunta": "Tu respuesta siguiendo las reglas",
  "estatus": "Nuevo | Pendientes | Candidato Óptimo | Rechazado",
  "cedis": "Editorial | UPS | null",
  "extraccion": { ... }
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: systemPrompt }, ...historialReciente, { role: 'user', content: mensajeUsuario }],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    const resData = await response.json();
    const parsed = JSON.parse(resData.choices[0].message.content);
    if (info?.vacante_cedis) parsed.cedis = info.vacante_cedis;

    parsed._historial = [...historialCompleto, { role: 'user', content: mensajeUsuario }, { role: 'assistant', content: parsed.pregunta }].slice(-40);
    return JSON.stringify(parsed);
  } catch (e) {
    return JSON.stringify({ pregunta: "Perdona, me perdí un momento. ¿Me repites eso? 🙏", estatus: "Pendientes", extraccion: {} });
  }
};