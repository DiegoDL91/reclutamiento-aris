import { supabase } from './supabase';

// Esta función decide el cedis según la zona, sin IA
function detectarCedis(zona: string): string | null {
  const z = zona.toLowerCase();
  if (z.includes('azcapotzalco') || z.includes('rosario') || z.includes('vallejo') || 
      z.includes('cdmx') || z.includes('ciudad de mexico') || z.includes('popotla') ||
      z.includes('norte') || z.includes('claveria')) {
    return 'Editorial';
  }
  if (z.includes('cuautitlan') || z.includes('izcalli') || z.includes('sabino') || 
      z.includes('edo') || z.includes('estado de mexico') || z.includes('tultitlan') ||
      z.includes('tultepec') || z.includes('coacalco') || z.includes('tlalnepantla')) {
    return 'UPS';
  }
  return null;
}

export const arisBrain = async (mensajeUsuario: string, telefono: string) => {
  const apiKey = process.env.GROQ_API_KEY;

  const { data: info } = await supabase
    .from('candidatos_respuestas')
    .select('*')
    .eq('telefono_whatsapp', telefono)
    .maybeSingle();

  // El CÓDIGO decide el paso, no la IA
  let paso = '';
  let cedisDetectado: string | null = null;

  if (!info?.nombre_completo) {
    paso = 'pedir_nombre';
  } else if (!info?.edad) {
    paso = 'pedir_edad';
  } else if (!info?.zona_vivienda) {
    paso = 'pedir_zona';
  } else if (!info?.vacante_cedis) {
    // Intentamos detectar cedis de la zona
    cedisDetectado = detectarCedis(info.zona_vivienda);
    if (!cedisDetectado) {
      // Si no podemos detectar, preguntamos si puede ir a alguna de las dos zonas
      paso = 'confirmar_zona';
    } else {
      paso = 'presentar_vacante';
    }
  } else if (!info?.turno_preferido) {
    paso = 'pedir_turno';
  } else if (info?.estado_civil === null || info?.estado_civil === undefined) {
    paso = 'pedir_estado_civil';
  } else if (info?.dependientes_economicos === null || info?.dependientes_economicos === undefined) {
    paso = 'pedir_dependientes';
  } else if (Number(info?.dependientes_economicos) > 0 && (info?.apoyo_cuidado_hijos === null || info?.apoyo_cuidado_hijos === undefined)) {
    paso = 'pedir_apoyo_cuidado';
  } else if (!info?.tiempo_traslado_minutos) {
    paso = 'pedir_traslado';
  } else if (info?.inconveniente_traslado === null || info?.inconveniente_traslado === undefined) {
    paso = 'pedir_inconveniente_traslado';
  } else if (info?.escolaridad_comprobable === null || info?.escolaridad_comprobable === undefined) {
    paso = 'pedir_escolaridad';
  } else if (info?.experiencia_almacen_meses === null || info?.experiencia_almacen_meses === undefined) {
    paso = 'pedir_experiencia';
  } else if (info?.tiene_constancias_laborales === null || info?.tiene_constancias_laborales === undefined) {
    paso = 'pedir_constancias';
  } else if (info?.nivel_salud_percecion === null || info?.nivel_salud_percecion === undefined) {
    paso = 'pedir_salud';
  } else if (info?.enfermedades_cronicas === null || info?.enfermedades_cronicas === undefined) {
    paso = 'pedir_enfermedades';
  } else if (info?.lesiones_cirugias === null || info?.lesiones_cirugias === undefined) {
    paso = 'pedir_lesiones';
  } else if (info?.alergias === null || info?.alergias === undefined) {
    paso = 'pedir_alergias';
  } else if (info?.esta_embarazada === null || info?.esta_embarazada === undefined) {
    paso = 'pedir_embarazo';
  } else if (info?.problemas_respiratorios === null || info?.problemas_respiratorios === undefined) {
    paso = 'pedir_respiratorio';
  } else if (info?.sufre_vertigo === null || info?.sufre_vertigo === undefined) {
    paso = 'pedir_vertigo';
  } else if (info?.usa_lentes === null || info?.usa_lentes === undefined) {
    paso = 'pedir_lentes';
  } else if (info?.credito_infonavit_fonacot === null || info?.credito_infonavit_fonacot === undefined) {
    paso = 'pedir_credito';
  } else if (info?.procesos_legales_antecedentes === null || info?.procesos_legales_antecedentes === undefined) {
    paso = 'pedir_antecedentes';
  } else if (info?.documentacion_completa === null || info?.documentacion_completa === undefined) {
    paso = 'pedir_documentos';
  } else if (info?.tiene_botas_casquillo === null || info?.tiene_botas_casquillo === undefined) {
    paso = 'pedir_botas';
  } else if (info?.referidos_familiares === null || info?.referidos_familiares === undefined) {
    paso = 'pedir_referidos';
  } else if (info?.reingreso === null || info?.reingreso === undefined) {
    paso = 'pedir_reingreso';
  } else if (!info?.banco) {
    paso = 'pedir_banco';
  } else {
    paso = 'finalizar';
  }

  const cedis = info?.vacante_cedis || cedisDetectado;

  const turnosTexto = cedis === 'Editorial'
    ? 'Matutino (6am-4pm), Vespertino (1pm-10pm) o Nocturno (10pm-7am)'
    : cedis === 'UPS1'
    ? 'Solo Matutino (8am-6pm)'
    : 'Matutino (8am-6pm), Vespertino (11am-10pm) o Nocturno (10pm-6am)';

  const vacanteMensaje = cedis === 'Editorial'
    ? 'Tenemos vacante de Auxiliar de Almacén en Azcapotzalco, CDMX. $220/día + prestaciones de ley. ¿Te interesa?'
    : 'Tenemos vacante de Auxiliar de Almacén en El Sabino, Cuautitlán Izcalli. $250/día + prestaciones de ley. ¿Te interesa?';

  const prompt = `
Eres ARIS, reclutadora de Rio Logística. Redactas mensajes de WhatsApp naturales y muy breves.

NOMBRE DEL CANDIDATO: ${info?.nombre_completo || ''}
PASO ACTUAL: ${paso}
MENSAJE DEL CANDIDATO: "${mensajeUsuario}"

REDACTA el mensaje para este paso. Sin saludos excepto en pedir_nombre. Sin explicaciones. Máximo 2 líneas.

${paso === 'pedir_nombre' ? 'Saluda como ARIS de Rio Logística y pide el nombre completo.' : ''}
${paso === 'pedir_edad' ? 'Pide la edad.' : ''}
${paso === 'pedir_zona' ? 'Pide la colonia o municipio donde vive.' : ''}
${paso === 'confirmar_zona' ? '¿Puedes trasladarte a Azcapotzalco CDMX o a Cuautitlán Izcalli EdoMex?' : ''}
${paso === 'presentar_vacante' ? vacanteMensaje : ''}
${paso === 'pedir_turno' ? `¿Qué turno prefieres? ${turnosTexto}` : ''}
${paso === 'pedir_estado_civil' ? '¿Cuál es tu estado civil?' : ''}
${paso === 'pedir_dependientes' ? '¿Tienes hijos u otras personas que dependan de ti económicamente?' : ''}
${paso === 'pedir_apoyo_cuidado' ? '¿Cuentas con alguien que te apoye con el cuidado de tus hijos mientras trabajas?' : ''}
${paso === 'pedir_traslado' ? '¿Cuánto tiempo te tardarías en llegar al trabajo?' : ''}
${paso === 'pedir_inconveniente_traslado' ? '¿Tienes algún inconveniente con el horario o traslado?' : ''}
${paso === 'pedir_escolaridad' ? '¿Cuál es tu nivel de estudios y es comprobable con documentos?' : ''}
${paso === 'pedir_experiencia' ? '¿Tienes experiencia en almacén? ¿Cuánto tiempo?' : ''}
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
${paso === 'pedir_documentos' ? '¿Cuentas con documentación original completa? (INE, CURP, NSS, comprobante domicilio)' : ''}
${paso === 'pedir_botas' ? (cedis === 'UPS' || cedis === 'UPS1' || cedis === 'UPS2' ? '¿Cuentas con botas de casquillo? En este almacén es obligatorio, no aplica tenis.' : '¿Cuentas con botas o tenis de casquillo?') : ''}
${paso === 'pedir_referidos' ? '¿Tienes familiares o conocidos trabajando en Rio Logística?' : ''}
${paso === 'pedir_reingreso' ? '¿Has trabajado antes con Rio Logística?' : ''}
${paso === 'pedir_banco' ? '¿En qué banco tienes tu cuenta?' : ''}
${paso === 'finalizar' ? `
Datos: vertigo=${info?.sufre_vertigo}, embarazada=${info?.esta_embarazada}, antecedentes=${info?.procesos_legales_antecedentes}, botas=${info?.tiene_botas_casquillo}, cedis=${cedis}
Si algún descarte → mensaje amable de que no hay vacante disponible para su perfil.
Si todo bien → "Listo ${info?.nombre_completo}, registré tu información. El equipo te contactará pronto para los siguientes pasos. ¡Éxito! 🙌"
` : ''}

EXTRAE del mensaje del candidato lo que corresponde al paso actual.

RESPONDE SOLO CON ESTE JSON:
{
  "pregunta": "mensaje redactado",
  "estatus": "Nuevo|Pendiente|Candidato Óptimo|Rechazado",
  "cedis": "${cedisDetectado || info?.vacante_cedis || 'null'}",
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

    // Si detectamos cedis por zona, lo forzamos en la respuesta
    if (cedisDetectado) {
      parsed.cedis = cedisDetectado;
    }

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