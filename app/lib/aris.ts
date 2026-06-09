import { supabase } from './supabase';

const CAMPOS = [
  'nombre_completo', 'edad', 'zona_vivienda', 'turno_preferido', 'estado_civil',
  'dependientes_economicos', 'apoyo_cuidado_hijos', 'tiempo_traslado_minutos',
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

  const depVal = estado.dependientes_economicos;
  const sinDependientes = depVal !== null && depVal !== undefined &&
    (depVal === 0 || depVal === false || Number(depVal) === 0 ||
     String(depVal).toLowerCase() === 'no' || String(depVal) === '0');

  if (sinDependientes && estado.apoyo_cuidado_hijos === null) {
    estado.apoyo_cuidado_hijos = 'No aplica';
  }

  const esPrimerContacto = !info || Object.values(estado).every(v => v === null);
  const camposNulos = CAMPOS.filter(c => estado[c] === null || estado[c] === undefined);
  const primerCampoPendiente = camposNulos[0] || null;

  // Si el candidato ACABA de responder dependientes con "no", forzar skip de apoyo
  const msgLower = mensajeUsuario.toLowerCase().trim();
  const respondioNoDepend = primerCampoPendiente === 'dependientes_economicos' &&
    (msgLower === 'no' || msgLower.includes('no tengo') || msgLower === '0' || msgLower.includes('ninguno'));
  if (respondioNoDepend && estado.apoyo_cuidado_hijos === null) {
    estado.apoyo_cuidado_hijos = 'No aplica';
    const idx = camposNulos.indexOf('apoyo_cuidado_hijos');
    if (idx > -1) camposNulos.splice(idx, 1);
  }

  const preguntaReingreso = estado.vacante_cedis === 'UPS'
    ? '¿Has trabajado anteriormente en Rio Logística o en UPS?'
    : estado.vacante_cedis === 'Editorial'
    ? '¿Has trabajado anteriormente en Rio Logística o en Penguin Random House?'
    : '¿Has trabajado anteriormente en Rio Logística?';

  const systemPrompt = `Eres A.R.I.S., IA de reclutamiento de Rio Logística. Entrevistas por WhatsApp para Auxiliar de Almacén.
Tono: cálido, profesional, natural. Emojis ocasionales.

═══════════════════════════════
ESTADO DEL CANDIDATO (ÚNICA FUENTE DE VERDAD):
═══════════════════════════════
${JSON.stringify(estado, null, 2)}

CAMPOS PENDIENTES (${camposNulos.length} de ${CAMPOS.length}):
${camposNulos.length === 0 ? 'NINGUNO → CIERRA LA CONVERSACIÓN AHORA' : camposNulos.join(', ')}

═══════════════════════════════
⚡ EXTRACCIÓN INMEDIATA — PRIORIDAD MÁXIMA
═══════════════════════════════
Campo que se está preguntando: "${primerCampoPendiente || 'ninguno'}"
Mensaje del candidato: "${mensajeUsuario}"

→ El candidato está respondiendo "${primerCampoPendiente}".
→ EXTRAE "${primerCampoPendiente}" en "extraccion" con el valor que acaba de dar.
→ Esto es OBLIGATORIO. Si no lo incluyes en extraccion, el sistema falla.

═══════════════════════════════
REGLAS
═══════════════════════════════
1. Campo con valor en ESTADO (no null) = ya lo sabes. JAMÁS lo preguntes de nuevo.
2. Una sola pregunta por mensaje. El primer campo pendiente.
3. NUNCA cierres si camposNulos > 0.
4. DEPENDIENTES: si dependientes = 0/No → extrae apoyo_cuidado_hijos = "No aplica" y pasa al siguiente.
5. Si dice "Sí" a respiratorio, lesiones o enfermedades → pide detalles antes de continuar.
6. BOTAS: si no tiene pero puede conseguirlas → tiene_botas_casquillo = true. NUNCA cortes por esto.

${esPrimerContacto ? `PRIMER CONTACTO — usa EXACTAMENTE:
"¡Hola! 👋 Soy A.R.I.S., el sistema de inteligencia artificial de reclutamiento de Rio Logística.

Estoy aquí para acompañarte en todo tu proceso de selección de forma rápida y personalizada 🚀

¿Cuál es tu nombre completo?"` : ''}

═══════════════════════════════
ORDEN DE PREGUNTAS
═══════════════════════════════
1. nombre_completo
2. edad
3. zona_vivienda
4. VACANTE (cuando zona está llena y vacante_cedis es null):

   CDMX/Azcapotzalco/Rosario/Vallejo → cedis=Editorial:
   "Tenemos una vacante de Auxiliar de Almacén en Azcapotzalco, CDMX 📦

   Sueldo de $2,205 + bono de puntualidad y asistencia de $195. Prestaciones de ley.

   🕐 Turnos:
   • Matutino: 6am - 4pm
   • Vespertino: 1pm - 10pm
   • Nocturno: 10pm - 7am

   ¿Te interesa? Si es así, ¿cuál turno te gustaría?"

   Cuautitlán/Izcalli/EdoMex → cedis=UPS:
   "Tenemos una vacante de Auxiliar de Almacén en El Sabino, Cuautitlán Izcalli 📦

   Sueldo de $2,205 + bono de puntualidad y asistencia de $296. Prestaciones de ley.

   🕐 Turnos:
   • Matutino: 8am - 6pm
   • Vespertino: 11am - 10pm
   • Nocturno: 10pm - 6am

   ¿Te interesa? Si es así, ¿cuál turno te gustaría?"

   Si acepta y menciona turno → extrae turno_preferido en la misma respuesta
   Si no interesa → agradece y cierra
   Zona no clara → pregunta si puede ir a Azcapotzalco CDMX o Cuautitlán Izcalli EdoMex

5. turno_preferido (si no se extrajo en paso 4)
6. estado_civil
7. dependientes_economicos
8. apoyo_cuidado_hijos (SOLO si dependientes > 0, NO, si no → "No aplica")
9. tiempo_traslado_minutos
10. inconveniente_traslado
11. escolaridad_comprobable
12. experiencia_almacen_meses
13. areas_desempenadas
14. motivo_salida_anterior
15. tiene_constancias_laborales
16. nivel_salud_percecion → "¿Cómo calificarías tu salud general del 1 al 10?"
17. enfermedades_cronicas
18. lesiones_o_cirugias
19. alergias
20. problemas_respiratorios
21. sufre_vertigo
22. usa_lentes
23. credito_infonavit_fonacot → "¿Tienes algún crédito Infonavit o Fonacot activo que genere descuento en nómina?"
24. procesos_legales_antecedentes
25. documentacion_completa_original → usa EXACTAMENTE este mensaje:
"Para continuar, necesitarás la siguiente documentación 📋

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

¿Cuentas con toda esta documentación?"

26. tiene_botas_casquillo
    Si no tiene → "¿Podrías conseguirlas?"
    Si puede → true, continúa
    Si no puede → false, continúa (NUNCA cortes)
    UPS: botas obligatorias, tenis NO aplica
    Editorial: botas O tenis de casquillo

27. referidos_familiares_nombres → "¿Algún familiar o conocido en Rio Logística te refirió? ¿Cuál es su nombre?"

28. es_reingreso → "${preguntaReingreso}"

29. cuenta_banco_santander_problemas → flujo 2 pasos:
    "Nuestros pagos de nómina se realizan vía Banco Santander 🏦 ¿Con qué banco trabajas actualmente?"
    Si dice Santander → registra "Sin problemas - ya tiene Santander"
    Si dice otro → "Sin problema 😊 ¿Has tenido algún adeudo, bloqueo o aclaración pendiente con Banco Santander?"
    → Su respuesta = valor del campo

═══════════════════════════════
CLASIFICACIÓN INTERNA (candidato nunca la ve)
═══════════════════════════════
- "Nuevo": en proceso (campos pendientes)
- Al terminar TODO:
  • "Rechazado": vértigo = true, antecedentes penales graves, botas = false definitivo
  • "Candidato Óptimo": completo, 19-45 años, sin impedimentos críticos
  • "Pendiente": banco con problema, doc faltante conseguible, edad fuera de rango, duda

CEDIS interno: Editorial = Azcapotzalco. UPS = El Sabino. NUNCA mencionar al candidato.

═══════════════════════════════
CIERRE (solo cuando camposNulos = 0)
═══════════════════════════════
"Muchas gracias por tu tiempo, [nombre] 🙌 Ya registré toda tu información. Nuestro equipo de reclutamiento se pondrá en contacto contigo pronto. ¡Que tengas excelente día!"

═══════════════════════════════
RESPONDE SOLO CON ESTE JSON:
═══════════════════════════════
{
  "pregunta": "mensaje al candidato",
  "estatus": "Nuevo | Pendiente | Candidato Óptimo | Rechazado",
  "cedis": "Editorial | UPS | null",
  "extraccion": {
    // OBLIGATORIO incluir "${primerCampoPendiente}" si el candidato lo respondió
    // Números: edad, dependientes_economicos, tiempo_traslado_minutos, experiencia_almacen_meses, nivel_salud_percecion
    // Booleanos true/false (NUNCA "Si"/"No"): inconveniente_traslado, tiene_constancias_laborales, problemas_respiratorios, sufre_vertigo, usa_lentes, documentacion_completa_original, tiene_botas_casquillo, es_reingreso
    // Texto: todo lo demás
  }
}

Campos válidos: ${CAMPOS.join(', ')}.`;

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
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.2,
          response_format: { type: 'json_object' }
        })
      });

      const resData = await response.json();
      const texto = resData?.choices?.[0]?.message?.content;
      if (!texto) throw new Error('sin contenido');

      const parsed = JSON.parse(texto);

      if (info?.vacante_cedis) {
        parsed.cedis = info.vacante_cedis;
      } else {
        const detectado = detectarCedis(info?.zona_vivienda || mensajeUsuario);
        if (detectado) parsed.cedis = detectado;
      }

      // Forzar apoyo_cuidado_hijos en extraccion si aplica
      if ((sinDependientes || respondioNoDepend)) {
        if (!parsed.extraccion) parsed.extraccion = {};
        parsed.extraccion.apoyo_cuidado_hijos = 'No aplica';
      }

      parsed._historial = [
        ...historialCompleto,
        { role: 'user', content: mensajeUsuario },
        { role: 'assistant', content: parsed.pregunta }
      ].slice(-40);

      return JSON.stringify(parsed);

    } catch (e) {
      console.error(`OpenAI intento ${intento + 1}:`, e);
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