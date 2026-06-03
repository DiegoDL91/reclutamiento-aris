import { supabase } from './supabase';

export const arisBrain = async (mensajeUsuario: string, telefono: string) => {
  const apiKey = process.env.GROQ_API_KEY;

  const { data: info } = await supabase
    .from('candidatos_respuestas')
    .select('*')
    .eq('telefono_whatsapp', telefono)
    .maybeSingle();

  const cedis = info?.vacante_cedis;

  const paso =
    !info?.nombre_completo ? 'pedir_nombre'
    : !info?.edad ? 'pedir_edad'
    : !info?.zona_vivienda ? 'pedir_zona'
    : !cedis ? 'presentar_vacante'
    : !info?.turno_preferido ? 'pedir_turno'
    : info?.estado_civil === null || info?.estado_civil === undefined ? 'pedir_estado_civil'
    : info?.dependientes_economicos === null || info?.dependientes_economicos === undefined ? 'pedir_dependientes'
    : info?.dependientes_economicos > 0 && (info?.apoyo_cuidado_hijos === null || info?.apoyo_cuidado_hijos === undefined) ? 'pedir_apoyo_cuidado'
    : info?.tiempo_traslado_minutos === null || info?.tiempo_traslado_minutos === undefined ? 'pedir_traslado'
    : info?.inconveniente_traslado === null || info?.inconveniente_traslado === undefined ? 'pedir_inconveniente_traslado'
    : info?.escolaridad_comprobable === null || info?.escolaridad_comprobable === undefined ? 'pedir_escolaridad'
    : info?.experiencia_almacen_meses === null || info?.experiencia_almacen_meses === undefined ? 'pedir_experiencia'
    : info?.tiene_constancias_laborales === null || info?.tiene_constancias_laborales === undefined ? 'pedir_constancias'
    : info?.nivel_salud_percecion === null || info?.nivel_salud_percecion === undefined ? 'pedir_salud'
    : info?.enfermedades_cronicas === null || info?.enfermedades_cronicas === undefined ? 'pedir_enfermedades'
    : info?.lesiones_cirugias === null || info?.lesiones_cirugias === undefined ? 'pedir_lesiones'
    : info?.alergias === null || info?.alergias === undefined ? 'pedir_alergias'
    : info?.esta_embarazada === null || info?.esta_embarazada === undefined ? 'pedir_embarazo'
    : info?.problemas_respiratorios === null || info?.problemas_respiratorios === undefined ? 'pedir_respiratorio'
    : info?.sufre_vertigo === null || info?.sufre_vertigo === undefined ? 'pedir_vertigo'
    : info?.usa_lentes === null || info?.usa_lentes === undefined ? 'pedir_lentes'
    : info?.credito_infonavit_fonacot === null || info?.credito_infonavit_fonacot === undefined ? 'pedir_credito'
    : info?.procesos_legales_antecedentes === null || info?.procesos_legales_antecedentes === undefined ? 'pedir_antecedentes'
    : info?.documentacion_completa === null || info?.documentacion_completa === undefined ? 'pedir_documentos'
    : info?.tiene_botas_casquillo === null || info?.tiene_botas_casquillo === undefined ? 'pedir_botas'
    : info?.referidos_familiares === null || info?.referidos_familiares === undefined ? 'pedir_referidos'
    : info?.reingreso === null || info?.reingreso === undefined ? 'pedir_reingreso'
    : !info?.banco ? 'pedir_banco'
    : 'finalizar';

  const turnosDisponibles = cedis === 'Editorial'
    ? 'Matutino (6am-4pm), Vespertino (1pm-10pm), Nocturno (10pm-7am)'
    : cedis === 'UPS1'
    ? 'Solo Matutino (8am-6pm)'
    : cedis === 'UPS2'
    ? 'Matutino (8am-6pm), Vespertino (11am-10pm), Nocturno (10pm-6am)'
    : '';

  const prompt = `
Eres ARIS, reclutadora de Rio Logística. Escribes por WhatsApp de forma natural y muy breve.

REGLAS:
- Solo saluda si el paso es "pedir_nombre". En los demás ve directo.
- Máximo 2 líneas por mensaje.
- Extrae del mensaje del candidato el dato del paso actual.
- NUNCA menciones "UPS 1", "UPS 2", "UPS1", "UPS2" ni "Penguin" ni "Editorial" al candidato.
- NUNCA pidas confirmación del nombre, solo extráelo y avanza.

NOMBRE: ${info?.nombre_completo || 'desconocido'}
CEDIS: ${cedis || 'ninguno'}
TURNO: ${info?.turno_preferido || 'ninguno'}
PASO ACTUAL: ${paso}
MENSAJE DEL CANDIDATO: "${mensajeUsuario}"

INSTRUCCIÓN:
${paso === 'pedir_nombre' ? 'Saluda como ARIS de Rio Logística y pide el nombre completo. Sin preguntar nada más.' : ''}
${paso === 'pedir_edad' ? 'Solo pide la edad.' : ''}
${paso === 'pedir_zona' ? 'Solo pide la colonia o municipio donde vive.' : ''}
${paso === 'presentar_vacante' ? `
Zona del candidato: "${info?.zona_vivienda}"
Si menciona Azcapotzalco, CDMX, norte CDMX → presenta Editorial y asigna cedis=Editorial:
"Tenemos vacante de Auxiliar de Almacén en Azcapotzalco, CDMX. $220/día + prestaciones de ley. ¿Te interesa?"
Si menciona Cuautitlán, Izcalli, El Sabino, Estado de México, EdoMex → pregunta si prefiere UPS1 o UPS2:
"Tenemos vacante de Auxiliar de Almacén en El Sabino, Cuautitlán Izcalli. $250/día + prestaciones de ley. ¿Te interesa?"
y asigna cedis=UPS1 o UPS2 según lo que diga después.
Si no es claro → "¿Puedes trasladarte a Azcapotzalco CDMX o a Cuautitlán Izcalli EdoMex?"
` : ''}
${paso === 'pedir_turno' ? `
Turnos disponibles para este candidato: ${turnosDisponibles}
Pregunta qué turno prefiere mostrando las opciones disponibles.
` : ''}
${paso === 'pedir_estado_civil' ? '¿Cuál es tu estado civil?' : ''}
${paso === 'pedir_dependientes' ? '¿Tienes hijos u otras personas que dependan económicamente de ti?' : ''}
${paso === 'pedir_apoyo_cuidado' ? '¿Cuentas con alguien que te apoye con el cuidado de tus hijos mientras trabajas?' : ''}
${paso === 'pedir_traslado' ? '¿Cuánto tiempo te tardarías aproximadamente en llegar al trabajo?' : ''}
${paso === 'pedir_inconveniente_traslado' ? '¿Tienes algún inconveniente con el horario o el traslado?' : ''}
${paso === 'pedir_escolaridad' ? '¿Cuál es tu escolaridad y es comprobable con documentos?' : ''}
${paso === 'pedir_experiencia' ? '¿Tienes experiencia trabajando en almacén? ¿Cuánto tiempo?' : ''}
${paso === 'pedir_constancias' ? '¿Cuentas con constancias de trabajos anteriores?' : ''}
${paso === 'pedir_salud' ? '¿Cómo calificarías tu salud general del 1 al 10?' : ''}
${paso === 'pedir_enfermedades' ? '¿Padeces alguna enfermedad crónica?' : ''}
${paso === 'pedir_lesiones' ? '¿Has tenido alguna lesión o cirugía reciente?' : ''}
${paso === 'pedir_alergias' ? '¿Tienes alguna alergia?' : ''}
${paso === 'pedir_embarazo' ? '¿Actualmente estás embarazada?' : ''}
${paso === 'pedir_respiratorio' ? '¿Padeces alguna enfermedad respiratoria o pulmonar?' : ''}
${paso === 'pedir_vertigo' ? '¿Sufres de vértigo o miedo a las alturas?' : ''}
${paso === 'pedir_lentes' ? '¿Usas lentes o tienes algún problema de visión?' : ''}
${paso === 'pedir_credito' ? '¿Tienes algún crédito activo de INFONAVIT o FONACOT?' : ''}
${paso === 'pedir_antecedentes' ? '¿Tienes algún proceso legal o antecedentes penales?' : ''}
${paso === 'pedir_documentos' ? '¿Cuentas con documentación original completa? (INE, CURP, NSS, comprobante de domicilio)' : ''}
${paso === 'pedir_botas' ? cedis === 'Editorial'
  ? '¿Cuentas con botas o tenis de casquillo?'
  : '¿Cuentas con botas de casquillo? (En este almacén es obligatorio, no aplica tenis)' : ''}
${paso === 'pedir_referidos' ? '¿Tienes familiares o conocidos trabajando actualmente en Rio Logística?' : ''}
${paso === 'pedir_reingreso' ? '¿Has trabajado antes con Rio Logística?' : ''}
${paso === 'pedir_banco' ? '¿En qué banco tienes tu cuenta?' : ''}
${paso === 'finalizar' ? `
Evalúa al candidato con estos datos: ${JSON.stringify(info || {})}
- Si sufre_vertigo=true → Rechazado
- Si esta_embarazada=true → Rechazado  
- Si procesos_legales_antecedentes=true → Rechazado
- Si cedis=UPS1 o UPS2 y tiene_botas_casquillo=false → Rechazado
- Si cedis=Editorial y tiene_botas_casquillo=false → Rechazado
- Si pasó todo y edad entre 19-45 → Candidato Óptimo
- Si algo dudoso → Pendiente
Mensaje de cierre según resultado.
` : ''}

RESPONDE SOLO CON ESTE JSON SIN TEXTO EXTRA:
{
  "pregunta": "tu mensaje",
  "estatus": "Nuevo|Pendiente|Candidato Óptimo|Rechazado",
  "cedis": "Editorial|UPS1|UPS2|null",
  "extracccion": {
    "nombre_completo": null,
    "edad": null,
    "zona_vivienda": null,
    "turno_preferido": null,
    "estado_civil": null,
    "dependientes_economicos": null,
    "apoyo_cuidado_hijos": null,
    "tiempo_traslado_minutos": null,
    "inconveniente_traslado": null,
    "escolaridad_comprobable": null,
    "experiencia_almacen_meses": null,
    "areas_desempenadas": null,
    "tiene_constancias_laborales": null,
    "nivel_salud_percecion": null,
    "enfermedades_cronicas": null,
    "lesiones_cirugias": null,
    "alergias": null,
    "esta_embarazada": null,
    "problemas_respiratorios": null,
    "sufre_vertigo": null,
    "usa_lentes": null,
    "credito_infonavit_fonacot": null,
    "procesos_legales_antecedentes": null,
    "documentacion_completa": null,
    "tiene_botas_casquillo": null,
    "referidos_familiares": null,
    "reingreso": null,
    "banco": null
  }
}
`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })
    });

    const resData = await response.json();
    const texto = resData.choices[0].message.content;
    const parsed = JSON.parse(texto);
    return JSON.stringify(parsed);

  } catch (e) {
    console.error("Groq error:", e);
    return JSON.stringify({
      "pregunta": "Hola, soy ARIS de Rio Logística 👋 ¿Cuál es tu nombre completo?",
      "estatus": "Nuevo",
      "cedis": null,
      "extracccion": {}
    });
  }
};