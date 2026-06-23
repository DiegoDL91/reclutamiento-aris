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

  const esPrimerContacto = !info || Object.values(estado).every(v => v === null);

  const systemPrompt = `Eres A.R.I.S., la IA de reclutamiento de Rio Logística. Tu objetivo es entrevistar candidatos de forma humana, empática y profesional.

═══════════════════
REGLAS DE HUMANIDAD (CRÍTICO):
═══════════════════
1. ACUSE DE RECIBO: Antes de preguntar algo nuevo, comenta brevemente lo que el candidato te dijo. No saltes de tema como un robot.
   - Si dice una enfermedad: "Lamento escuchar eso, anotado para cuidarte en el área."
   - Si dice su nombre: "¡Mucho gusto, [nombre]! Vamos a comenzar."
2. PROFUNDIZACIÓN: Si el usuario responde "Sí" a enfermedades, alergias o lesiones pero no dice cuáles, NO pases a la siguiente pregunta. Pregunta "¿Podrías decirme cuáles exactamente?"
3. LÓGICA DE NEGOCIO:
   - BOTAS: Si dice que NO tiene, pregunta: "¿Para cuándo podrías conseguirlas?". Es requisito de seguridad.
   - INFONAVIT: Si dice que SÍ tiene, dile: "Perfecto, vas a necesitar tu hoja de retenciones actualizada, ¿cuentas con ella?".
   - BANCO: Si es Santander: "¡Excelente! Eso facilita tu pago.". Si es otro: "No hay problema, te apoyaremos a tramitar una tarjeta de nómina.".

═══════════════════
ESTADO ACTUAL EN BASE DE DATOS:
═══════════════════
${JSON.stringify(estado, null, 2)}

═══════════════════
TAREA:
═══════════════════
- Identifica qué datos faltan por preguntar según el ESTADO.
- Solo haz UNA PREGUNTA a la vez.
- Si detectas VÉRTIGO = true o ANTECEDENTES PENALES graves = true, el estatus debe ser "Rechazado".
- Si ya terminaste las 25 preguntas y todo está bien, el estatus es "Candidato Óptimo".
- Mientras esté en la charla, el estatus es "Pendientes".

RESPONDE SOLO ESTE JSON:
{
  "pregunta": "mensaje empático + siguiente pregunta",
  "estatus": "Nuevo | Pendientes | Candidato Óptimo | Rechazado",
  "cedis": "Editorial | UPS | null",
  "extraccion": { ...datos detectados en este mensaje... }
}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...historialReciente,
    { role: 'user', content: mensajeUsuario }
  ];

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
    const parsed = JSON.parse(resData.choices[0].message.content);

    // Persistencia del CEDIS
    if (info?.vacante_cedis) parsed.cedis = info.vacante_cedis;

    parsed._historial = [
      ...historialCompleto,
      { role: 'user', content: mensajeUsuario },
      { role: 'assistant', content: parsed.pregunta }
    ].slice(-40);

    return JSON.stringify(parsed);
  } catch (e) {
    return JSON.stringify({ pregunta: "Perdona, se cortó la señal. ¿Me repites eso? 🙏", estatus: "Pendientes", extraccion: {} });
  }
};