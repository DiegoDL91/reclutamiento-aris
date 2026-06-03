import { supabase } from './supabase';

export const arisBrain = async (mensajeUsuario: string, telefono: string) => {
  const apiKey = process.env.GROQ_API_KEY;

  const { data: info } = await supabase
    .from('candidatos_respuestas')
    .select('*')
    .eq('telefono_whatsapp', telefono)
    .maybeSingle();

  // Determinamos exactamente en qué paso está
  const paso = !info?.nombre_completo ? 'pedir_nombre'
    : !info?.edad ? 'pedir_edad'
    : !info?.zona_vivienda ? 'pedir_zona'
    : !info?.vacante_cedis ? 'presentar_vacante'
    : !info?.estado_civil ? 'pedir_estado_civil'
    : info?.dependientes_economicos === null ? 'pedir_dependientes'
    : info?.dependientes_economicos > 0 && info?.apoyo_cuidado_hijos === null ? 'pedir_apoyo_cuidado'
    : !info?.tiempo_traslado_minutos ? 'pedir_traslado'
    : info?.inconveniente_traslado === null ? 'pedir_inconveniente_traslado'
    : info?.escolaridad_comprobable === null ? 'pedir_escolaridad'
    : info?.experiencia_almacen_meses === null ? 'pedir_experiencia'
    : info?.tiene_constancias_laborales === null ? 'pedir_constancias'
    : info?.nivel_salud_percecion === null ? 'pedir_salud'
    : info?.enfermedades_cronicas === null ? 'pedir_enfermedades'
    : info?.lesiones_cirugias === null ? 'pedir_lesiones'
    : info?.alergias === null ? 'pedir_alergias'
    : info?.esta_embarazada === null ? 'pedir_embarazo'
    : info?.problemas_respiratorios === null ? 'pedir_respiratorio'
    : info?.sufre_vertigo === null ? 'pedir_vertigo'
    : info?.usa_lentes === null ? 'pedir_lentes'
    : info?.credito_infonavit_fonacot === null ? 'pedir_credito'
    : info?.procesos_legales_antecedentes === null ? 'pedir_antecedentes'
    : info?.documentacion_completa === null ? 'pedir_documentos'
    : info?.tiene_botas_casquillo === null ? 'pedir_botas'
    : info?.referidos_familiares === null ? 'pedir_referidos'
    : info?.reingreso === null ? 'pedir_reingreso'
    : !info?.banco ? 'pedir_banco'
    : 'finalizar';

  const cedis = info?.vacante_cedis;

  const prompt = `
Eres ARIS, reclutadora de Rio Logística. Escribes por WhatsApp de forma natural y breve.

REGLAS:
- Solo saluda si el paso es "pedir_nombre". En todos los demás, ve directo a la pregunta.
- Máximo 2 líneas por mensaje.
- Extrae del mensaje del candidato el dato que corresponde al paso actual.

PASO ACTUAL: ${paso}
NOMBRE DEL CANDIDATO: ${info?.nombre_completo || 'desconocido'}
CEDIS ASIGNADO: ${cedis || 'ninguno'}
MENSAJE DEL CANDIDATO: "${mensajeUsuario}"

INSTRUCCIÓN SEGÚN PASO:
${paso === 'pedir_nombre' ? 'Saluda como ARIS de Rio Logística y pide el nombre completo.' : ''}
${paso === 'pedir_edad' ? 'Pide la edad.' : ''}
${paso === 'pedir_zona' ? 'Pide la colonia o zona donde vive.' : ''}
${paso === 'presentar_vacante' ? `Según la zona "${info?.zona_vivienda}" presenta la vacante:
- Si es Cuautitlán/Izcalli/El Sabino/EdoMex → "Tenemos vacante de Auxiliar de Almacén en El Sabino, Cuautitlán Izcalli. $250/día + prestaciones. Turno matutino (8am-6pm) o vespertino (2pm-10pm). ¿Te interesa?" y asigna cedis=Farmaceutico
- Si es Azcapotzalco/CDMX → "Tenemos vacante de Auxiliar de Almacén en Azcapotzalco, CDMX. $220/día + prestaciones. Turno L-V 6am-4pm. ¿Te interesa?" y asigna cedis=Editorial
- Si no es claro → pregunta si puede ir a Cuautitlán Izcalli o Azcapotzalco` : ''}
${paso === 'pedir_estado_civil' ? 'Pregunta el estado civil.' : ''}
${paso === 'pedir_dependientes' ? 'Pregunta cuántos dependientes económicos tiene (hijos u otras personas a su cargo).' : ''}
${paso === 'pedir_apoyo_cuidado' ? 'Pregunta si cuenta con apoyo para el cuidado de sus hijos.' : ''}
${paso === 'pedir_traslado' ? 'Pregunta cuánto tiempo le tomaría trasladarse al trabajo aproximadamente.' : ''}
${paso === 'pedir_inconveniente_traslado' ? 'Pregunta si tiene algún inconveniente con el horario o el traslado.' : ''}
${paso === 'pedir_escolaridad' ? 'Pregunta su escolaridad y si es comprobable con documentos.' : ''}
${paso === 'pedir_experiencia' ? 'Pregunta si tiene experiencia en almacén y cuánto tiempo.' : ''}
${paso === 'pedir_constancias' ? 'Pregunta si cuenta con constancias de trabajos anteriores.' : ''}
${paso === 'pedir_salud' ? 'Pregunta cómo califica su salud general del 1 al 10.' : ''}
${paso === 'pedir_enfermedades' ? 'Pregunta si padece alguna enfermedad crónica.' : ''}
${paso === 'pedir_lesiones' ? 'Pregunta si ha tenido lesiones o cirugías recientes.' : ''}
${paso === 'pedir_alergias' ? 'Pregunta si tiene alguna alergia.' : ''}
${paso === 'pedir_embarazo' ? 'Pregunta de forma discreta si está embarazada.' : ''}
${paso === 'pedir_respiratorio' ? 'Pregunta si padece alguna enfermedad respiratoria o pulmonar.' : ''}
${paso === 'pedir_vertigo' ? 'Pregunta si sufre de vértigo o miedo a las alturas.' : ''}
${paso === 'pedir_lentes' ? 'Pregunta si usa lentes o tiene algún problema de visión.' : ''}
${paso === 'pedir_credito' ? 'Pregunta si tiene crédito activo de INFONAVIT o FONACOT.' : ''}
${paso === 'pedir_antecedentes' ? 'Pregunta si tiene algún proceso legal o antecedentes penales.' : ''}
${paso === 'pedir_documentos' ? 'Pregunta si cuenta con documentación original completa (INE, CURP, NSS, comprobante de domicilio).' : ''}
${paso === 'pedir_botas' ? cedis === 'Farmaceutico' 
  ? 'Pregunta si cuenta con botas de casquillo (obligatorio, no aplica tenis).' 
  : 'Pregunta si cuenta con botas o tenis de casquillo.' : ''}
${paso === 'pedir_referidos' ? 'Pregunta si tiene familiares o conocidos trabajando en Rio Logística.' : ''}
${paso === 'pedir_reingreso' ? 'Pregunta si ha trabajado antes con Rio Logística.' : ''}
${paso === 'pedir_banco' ? 'Pregunta en qué banco tiene su cuenta.' : ''}
${paso === 'finalizar' ? `Evalúa y responde:
- Si sufre_vertigo=true, esta_embarazada=true, o procesos_legales_antecedentes=true → estatus=Rechazado, mensaje amable de descarte.
- Si cedis=Farmaceutico y tiene_botas_casquillo=false → estatus=Rechazado.
- Si cedis=Editorial y tiene_botas_casquillo=false → estatus=Rechazado.
- Si pasó todo → estatus=Candidato Óptimo, mensaje: "Listo ${info?.nombre_completo}, registré tu información. El equipo te contactará pronto. ¡Éxito! 🙌"
- Si algo dudoso → estatus=Pendiente.` : ''}

RESPONDE SOLO CON ESTE JSON:
{
  "pregunta": "tu mensaje",
  "estatus": "Nuevo|Pendiente|Candidato Óptimo|Rechazado",
  "cedis": "Farmaceutico|Editorial|null",
  "extracccion": {
    "nombre_completo": null,
    "edad": null,
    "zona_vivienda": null,
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