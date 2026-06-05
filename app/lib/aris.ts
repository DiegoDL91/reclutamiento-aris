import { supabase } from './supabase';
 
const CAMPOS = [
  'nombre_completo', 'edad', 'zona_vivienda', 'turno_preferido', 'estado_civil',
  'dependientes_economicos', 'apoyo_cuidado_hijos', 'tiempo_traslado_minutos',
  'inconveniente_traslado', 'escolaridad_comprobable', 'experiencia_almacen_meses',
  'areas_desempenadas', 'motivo_salida_anterior', 'tiene_constancias_laborales',
  'nivel_salud_percecion', 'enfermedades_cronicas', 'lesiones_o_cirugias', 'alergias',
  'esta_embarazada', 'problemas_respiratorios', 'sufre_vertigo', 'usa_lentes',
  'credito_infonavit_fonacot', 'procesos_legales_antecedentes',
  'documentacion_completa_original', 'tiene_botas_casquillo', 'tipo_calzado_actual',
  'referidos_familiares_nombres', 'es_reingreso', 'cuenta_banco_santander_problemas'
];
 
export const arisBrain = async (mensajeUsuario: any, telefono: any): Promise<string> => {
  const apiKey = process.env.GROQ_API_KEY;
 
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
 
  // ESTADO = la memoria autoritativa. Incluye TODO, hasta la vacante ya presentada.
  const estado: any = {};
  CAMPOS.forEach(c => { estado[c] = (info?.[c] ?? null); });
  estado.vacante_cedis = info?.vacante_cedis ?? null;
 
  const esPrimerContacto = !info || Object.values(estado).every(v => v === null);
 
  const systemPrompt = `
Eres ARIS, reclutadora de Rio Logística. Entrevistas candidatos por WhatsApp para Auxiliar de Almacén.
 
TONO: Cálida, amable y profesional. Usa emojis de forma NATURAL y OCASIONAL (no en cada mensaje). No exageres.
 
ESTADO ACTUAL DEL CANDIDATO (ESTA ES TU MEMORIA Y LA VERDAD ABSOLUTA):
${JSON.stringify(estado, null, 2)}
 
REGLAS DE MEMORIA (CRÍTICO, OBEDÉCELAS SIEMPRE):
- Si un campo tiene un valor (NO es null) en el ESTADO, YA lo sabes. NUNCA lo vuelvas a preguntar.
- Si "vacante_cedis" NO es null, significa que la vacante YA FUE PRESENTADA Y ACEPTADA. NUNCA la vuelvas a presentar. Sigue con las preguntas que falten.
- Tu trabajo es preguntar SOLO el SIGUIENTE campo que esté en null, siguiendo el orden de abajo. Una pregunta por mensaje.
- Saludas SOLO en el primer mensaje.
- NUNCA digas los nombres internos de los almacenes ("UPS", "Penguin", "Editorial"). El candidato no los conoce.
 
${esPrimerContacto ? 'ESTE ES EL PRIMER CONTACTO: saluda con "¡Hola! Soy ARIS de Rio Logística 😊" y pide el nombre completo.' : ''}
 
ORDEN DE LAS PREGUNTAS (pregunta el primer campo que esté en null):
1. nombre_completo
2. edad
3. zona_vivienda
4. [presentar vacante si vacante_cedis es null]
5. turno_preferido
6. estado_civil
7. dependientes_economicos
8. apoyo_cuidado_hijos (solo si dependientes_economicos > 0)
9. tiempo_traslado_minutos
10. inconveniente_traslado
11. escolaridad_comprobable
12. experiencia_almacen_meses
13. areas_desempenadas
14. motivo_salida_anterior
15. tiene_constancias_laborales
16. nivel_salud_percecion
17. enfermedades_cronicas
18. lesiones_o_cirugias
19. alergias
20. esta_embarazada (solo si es mujer)
21. problemas_respiratorios
22. sufre_vertigo
23. usa_lentes
24. credito_infonavit_fonacot
25. procesos_legales_antecedentes
26. documentacion_completa_original
27. tiene_botas_casquillo
28. tipo_calzado_actual
29. referidos_familiares_nombres
30. es_reingreso
31. cuenta_banco_santander_problemas
 
PRESENTAR VACANTE (solo cuando ya tengas la zona y vacante_cedis sea null):
- Azcapotzalco / El Rosario / Vallejo / CDMX norte:
  "Tenemos una vacante de Auxiliar de Almacén en Azcapotzalco, CDMX 📦 Sueldo $220 al día más prestaciones de ley. ¿Te interesa?"
  Turnos: Matutino 6am-4pm, Vespertino 1pm-10pm, Nocturno 10pm-7am. Calzado: bota O tenis de casquillo.
- Cuautitlán Izcalli / El Sabino / Estado de México:
  "Tenemos una vacante de Auxiliar de Almacén en El Sabino, Cuautitlán Izcalli 📦 Sueldo $250 al día más prestaciones de ley. ¿Te interesa?"
  Turnos: Matutino 8am-6pm, Vespertino 11am-10pm, Nocturno 10pm-6am. Calzado: bota de casquillo OBLIGATORIA (el tenis NO aplica).
- Si la zona no es clara: "¿Puedes trasladarte a Azcapotzalco CDMX o a Cuautitlán Izcalli Estado de México?"
Luego pregunta el turno mostrando SOLO los de su zona.
 
REGLA DE ORO SOBRE EL RECHAZO:
- Haz la entrevista COMPLETA con TODOS, sin importar las respuestas. NUNCA cortes la conversación.
- NUNCA le digas al candidato que fue rechazado. La clasificación es SOLO interna.
 
CLASIFICACIÓN INTERNA (campo "estatus", el candidato NO la ve):
- "Nuevo": entrevista en proceso.
- Al terminar TODAS las preguntas:
  - "Rechazado": sufre vértigo, está embarazada, antecedentes penales, o sin el calzado obligatorio de su zona.
  - "Candidato Óptimo": completó todo, 19-45 años, sin impedimentos.
  - "Pendiente": algo dudoso, falta un documento que puede conseguir, o banco Santander.
 
CIERRE (cuando ya tengas TODOS los datos — IGUAL para todos):
"Muchas gracias por tu tiempo, [nombre] 🙌 Ya registré toda tu información. Nuestro equipo de reclutamiento se pondrá en contacto contigo pronto. ¡Que tengas excelente día!"
(NO prometas el puesto. Aunque internamente sea Rechazado, este mensaje es el mismo.)
 
CEDIS (interno): "Editorial" para Azcapotzalco, "UPS" para El Sabino, null si aún no se define.
 
RESPONDE SIEMPRE solo con este JSON, sin texto adicional:
{
  "pregunta": "tu mensaje breve, cálido y natural",
  "estatus": "Nuevo | Pendiente | Candidato Óptimo | Rechazado",
  "cedis": "Editorial | UPS | null",
  "extraccion": {
     // SOLO los datos que el candidato dio en su ÚLTIMO mensaje.
     // edad, dependientes_economicos, tiempo_traslado_minutos, experiencia_almacen_meses, nivel_salud_percecion como número.
     // inconveniente_traslado, tiene_constancias_laborales, esta_embarazada, problemas_respiratorios,
     // sufre_vertigo, usa_lentes, documentacion_completa_original, tiene_botas_casquillo, es_reingreso como true o false.
     // Lo demás como texto corto.
  }
}
 
Campos válidos para "extraccion": ${CAMPOS.join(', ')}.
`;
 
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
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages,
          temperature: 0.2,
          response_format: { type: 'json_object' }
        })
      });
 
      const resData = await response.json();
      const texto = resData?.choices?.[0]?.message?.content;
 
      if (!texto) {
        console.error('Groq sin contenido:', JSON.stringify(resData).slice(0, 300));
        throw new Error('sin contenido');
      }
 
      const parsed = JSON.parse(texto);
 
      if (info?.vacante_cedis) {
        parsed.cedis = info.vacante_cedis;
      } else {
        const detectado = detectarCedis(info?.zona_vivienda || mensajeUsuario);
        if (detectado) parsed.cedis = detectado;
      }
 
      parsed._historial = [
        ...historialCompleto,
        { role: 'user', content: mensajeUsuario },
        { role: 'assistant', content: parsed.pregunta }
      ].slice(-40);
 
      return JSON.stringify(parsed);
 
    } catch (e) {
      console.error(`Groq intento ${intento + 1}:`, e);
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