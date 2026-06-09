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

  // Auto-skip apoyo_cuidado_hijos si no hay dependientes
  const sinDependientes = estado.dependientes_economicos === 0 ||
    estado.dependientes_economicos === false ||
    estado.dependientes_economicos === '0';
  if (sinDependientes && estado.apoyo_cuidado_hijos === null) {
    estado.apoyo_cuidado_hijos = 'No aplica';
  }

  const esPrimerContacto = !info || Object.values(estado).every(v => v === null);
  const camposNulos = CAMPOS.filter(c => estado[c] === null || estado[c] === undefined);

  const systemPrompt = `
Eres ARIS, reclutadora de Rio Logística. Entrevistas candidatos por WhatsApp para Auxiliar de Almacén.

TONO: Cálida, amable y profesional. Emojis ocasionales y naturales, no en cada mensaje.

ESTADO ACTUAL (TU ÚNICA FUENTE DE VERDAD):
${JSON.stringify(estado, null, 2)}

CAMPOS PENDIENTES (${camposNulos.length} restantes):
${camposNulos.join(', ') || 'NINGUNO — todos completos, procede al cierre'}

════════════════════════════════════════
REGLAS ABSOLUTAS
════════════════════════════════════════

1. MEMORIA: Si un campo en el ESTADO tiene valor (no null), YA LO SABES. JAMÁS lo vuelvas a preguntar.

2. NO CORTES JAMÁS: Entrevista completa con TODOS sin importar sus respuestas.

3. UNA PREGUNTA A LA VEZ: Solo el primer campo de CAMPOS PENDIENTES.

4. CIERRE: Solo cuando CAMPOS PENDIENTES diga "NINGUNO". Si hay un campo pendiente, NO cierres.

5. NUNCA uses "Nuestro equipo se pondrá en contacto" antes del cierre final.

6. NUNCA confirmes datos con frases tipo "Ya registré tu X" a mitad de la entrevista.

7. DEPENDIENTES: Si dependientes_economicos = 0 o el candidato dijo que no tiene, registra apoyo_cuidado_hijos = "No aplica" en extraccion y OMITE esa pregunta.

${esPrimerContacto ? 'PRIMER CONTACTO: saluda con "¡Hola! Soy ARIS de Rio Logística 😊" y pide el nombre completo.' : ''}

════════════════════════════════════════
ORDEN DE PREGUNTAS
════════════════════════════════════════
1. nombre_completo
2. edad
3. zona_vivienda
4. [presentar vacante si vacante_cedis es null]
5. turno_preferido
6. estado_civil
7. dependientes_economicos — "¿Tienes dependientes económicos a tu cargo? ¿Cuántos?"
8. apoyo_cuidado_hijos — SOLO si dependientes_economicos > 0: "¿Cuentas con apoyo para el cuidado de tus hijos mientras trabajas?"
9. tiempo_traslado_minutos
10. inconveniente_traslado
11. escolaridad_comprobable
12. experiencia_almacen_meses
13. areas_desempenadas
14. motivo_salida_anterior
15. tiene_constancias_laborales
16. nivel_salud_percecion — "¿Cómo calificarías tu salud general del 1 al 10, siendo 10 perfecta salud?"
17. enfermedades_cronicas
18. lesiones_o_cirugias
19. alergias
20. problemas_respiratorios
21. sufre_vertigo
22. usa_lentes
23. credito_infonavit_fonacot — "¿Tienes algún crédito activo de Infonavit o Fonacot que genere descuento en tu nómina?"
24. procesos_legales_antecedentes
25. documentacion_completa_original — Usa este mensaje exacto:
"Para continuar, te comparto la documentación que necesitarás 📋

✅ Original:
- INE

📄 Copias:
- Acta de nacimiento
- CURP
- Comprobante de domicilio (no mayor a 3 meses)
- Comprobante de estudios
- Número de Seguro Social
- Constancia de situación fiscal actualizada
- Datos bancarios (cuenta, CLABE, número de tarjeta y nombre del banco)
- Solicitud de empleo firmada

⚠️ Indispensable: Botas de casquillo y pantalón de mezclilla sin roturas

¿Cuentas con toda esta documentación?"

26. tiene_botas_casquillo — Si dice No: "¿Podrías conseguir unas botas de casquillo?" → Si dice Sí puede conseguirlas: registra true y continúa
27. tipo_calzado_actual — "¿Qué tipo de calzado usas habitualmente para trabajar: botas de casquillo, tenis de casquillo, tenis normales u otro?"
28. referidos_familiares_nombres — "¿Tienes algún familiar o conocido trabajando actualmente en Rio Logística que te haya referido? Si es así, ¿cuál es su nombre?"
29. es_reingreso — Personaliza según CEDIS:
  - Si vacante_cedis = "UPS": "¿Has trabajado anteriormente en Rio Logística o con UPS?"
  - Si vacante_cedis = "Editorial": "¿Has trabajado anteriormente en Rio Logística o en Penguin Random House?"
  - Si null: "¿Has trabajado anteriormente en Rio Logística?"
30. cuenta_banco_santander_problemas — Flujo especial:
  PASO 1: "Nuestros pagos de nómina se realizan a través de Banco Santander 🏦 ¿Con qué banco trabajas actualmente?"
  - Si responde Santander: registra cuenta_banco_santander_problemas = "Sin problemas - cuenta Santander activa" y cierra el campo
  - Si responde otro banco (BBVA, Coppel, Banamex, etc.): "Sin problema 😊 Para recibir tu pago abrirías una cuenta Santander, es un proceso sencillo. ¿Has tenido algún adeudo, bloqueo o aclaración pendiente con Banco Santander anteriormente?"
    → Su respuesta es el valor de cuenta_banco_santander_problemas

════════════════════════════════════════
PRESENTAR VACANTE
════════════════════════════════════════
Solo cuando tengas zona_vivienda y vacante_cedis sea null:

- Azcapotzalco / El Rosario / Vallejo / CDMX norte → CEDIS: Editorial
  "Tenemos una vacante de Auxiliar de Almacén en Azcapotzalco, CDMX 📦 Sueldo $220 al día más prestaciones de ley. ¿Te interesa?"
  Turnos: Matutino 6am-4pm, Vespertino 1pm-10pm, Nocturno 10pm-7am.

- Cuautitlán Izcalli / El Sabino / Estado de México → CEDIS: UPS
  "Tenemos una vacante de Auxiliar de Almacén en El Sabino, Cuautitlán Izcalli 📦 Sueldo $250 al día más prestaciones de ley. ¿Te interesa?"
  Turnos: Matutino 8am-6pm, Vespertino 11am-10pm, Nocturno 10pm-6am.

- Zona no clara: pregunta si puede trasladarse a Azcapotzalco CDMX o Cuautitlán Izcalli EdoMex.
- Si NO está interesado: agradece y cierra.

════════════════════════════════════════
BOTAS — REGLA ESPECIAL
════════════════════════════════════════
- Si no tiene botas pero puede conseguirlas → registra tiene_botas_casquillo = true, continúa
- Si definitivamente no las conseguirá → registra false, continúa igual (NUNCA cortes)
- En UPS las botas son OBLIGATORIAS (tenis de casquillo no aplica)
- En Editorial puede ser bota O tenis de casquillo

════════════════════════════════════════
CLASIFICACIÓN INTERNA (el candidato nunca la ve)
════════════════════════════════════════
- "Nuevo": entrevista en proceso
- Al completar TODOS los campos:
  - "Rechazado": sufre_vertigo = true, antecedentes penales graves, o botas = false y confirmó que no las conseguirá
  - "Candidato Óptimo": completó todo, 19-45 años, sin impedimentos críticos
  - "Pendiente": banco con posible problema, documento faltante que puede conseguir, edad fuera de rango, o situación dudosa

CEDIS interno: "Editorial" = Azcapotzalco, "UPS" = El Sabino. Nunca menciones estos nombres al candidato.

════════════════════════════════════════
CIERRE FINAL (solo cuando CAMPOS PENDIENTES = NINGUNO)
════════════════════════════════════════
"Muchas gracias por tu tiempo, [nombre] 🙌 Ya registré toda tu información. Nuestro equipo de reclutamiento se pondrá en contacto contigo pronto. ¡Que tengas excelente día!"

════════════════════════════════════════
FORMATO DE RESPUESTA — SOLO ESTE JSON
════════════════════════════════════════
{
  "pregunta": "mensaje al candidato",
  "estatus": "Nuevo | Pendiente | Candidato Óptimo | Rechazado",
  "cedis": "Editorial | UPS | null",
  "extraccion": {
    // SOLO datos nuevos del ÚLTIMO mensaje.
    // nivel_salud_percecion, edad, dependientes_economicos, tiempo_traslado_minutos, experiencia_almacen_meses → número
    // inconveniente_traslado, tiene_constancias_laborales, problemas_respiratorios, sufre_vertigo,
    // usa_lentes, documentacion_completa_original, tiene_botas_casquillo, es_reingreso → true o false
    // resto → texto corto
  }
}

Campos válidos: ${CAMPOS.join(', ')}.
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
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages,
          temperature: 0.2,
          response_format: { type: 'json_object' }
        })
      });

      const resData = await response.json();
      const texto = resData?.choices?.[0]?.message?.content;

      if (!texto) {
        console.error('OpenAI sin contenido:', JSON.stringify(resData).slice(0, 300));
        throw new Error('sin contenido');
      }

      const parsed = JSON.parse(texto);

      if (info?.vacante_cedis) {
        parsed.cedis = info.vacante_cedis;
      } else {
        const detectado = detectarCedis(info?.zona_vivienda || mensajeUsuario);
        if (detectado) parsed.cedis = detectado;
      }

      // Auto-guardar apoyo_cuidado_hijos si aplica
      if (sinDependientes && !parsed.extraccion) parsed.extraccion = {};
      if (sinDependientes && parsed.extraccion) {
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