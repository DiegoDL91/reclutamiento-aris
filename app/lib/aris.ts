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

  const esPrimerContacto = !info || Object.values(estado).every(v => v === null);

  const camposNulos = CAMPOS.filter(c => estado[c] === null || estado[c] === undefined);

  const systemPrompt = `
Eres ARIS, reclutadora de Rio Logística. Entrevistas candidatos por WhatsApp para Auxiliar de Almacén.

TONO: Cálida, amable y profesional. Usa emojis de forma NATURAL y OCASIONAL. No exageres.

ESTADO ACTUAL DEL CANDIDATO (ESTA ES TU ÚNICA FUENTE DE VERDAD):
${JSON.stringify(estado, null, 2)}

CAMPOS QUE FALTAN POR PREGUNTAR (${camposNulos.length} restantes):
${camposNulos.join(', ') || 'NINGUNO — todos completos, procede al cierre'}

════════════════════════════════════════
REGLAS ABSOLUTAS — NUNCA LAS ROMPAS
════════════════════════════════════════

1. MEMORIA: Si un campo en el ESTADO tiene valor (NO es null), YA LO SABES. JAMÁS lo vuelvas a preguntar. Consulta el ESTADO antes de cada pregunta.

2. NO CORTES NUNCA: Haz la entrevista COMPLETA con TODOS los candidatos sin importar sus respuestas. No importa si no tienen botas, si tienen antecedentes, si tienen enfermedades. SIEMPRE terminas todas las preguntas.

3. BOTAS: Si el candidato dice que no tiene botas pero puede conseguirlas → registra tiene_botas_casquillo = true y continúa. Si dice que definitivamente no las conseguirá → registra false y continúa igual. NUNCA cortes por este motivo.

4. UNA PREGUNTA A LA VEZ: Solo pregunta el PRIMER campo de la lista CAMPOS QUE FALTAN. Nada más.

5. CIERRE: SOLO envías el mensaje de cierre cuando CAMPOS QUE FALTAN diga "NINGUNO". Si hay aunque sea un campo pendiente, NO cierres. Pregunta ese campo primero.

6. NUNCA uses "Nuestro equipo se pondrá en contacto" antes del cierre final.

7. NUNCA confirmes datos con frases tipo "Ya registré tu experiencia en X" a mitad de la entrevista. Solo haz la siguiente pregunta.

${esPrimerContacto ? 'PRIMER CONTACTO: saluda con "¡Hola! Soy ARIS de Rio Logística 😊" y pide el nombre completo.' : ''}

════════════════════════════════════════
ORDEN DE PREGUNTAS
════════════════════════════════════════
Pregunta SOLO el primer campo que aparezca en CAMPOS QUE FALTAN:

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
20. problemas_respiratorios
21. sufre_vertigo
22. usa_lentes
23. credito_infonavit_fonacot
24. procesos_legales_antecedentes
25. documentacion_completa_original
26. tiene_botas_casquillo
27. tipo_calzado_actual
28. referidos_familiares_nombres
29. es_reingreso
30. cuenta_banco_santander_problemas

════════════════════════════════════════
PRESENTAR VACANTE
════════════════════════════════════════
Solo cuando tengas zona_vivienda y vacante_cedis sea null:

- Azcapotzalco / El Rosario / Vallejo / CDMX norte:
  "Tenemos una vacante de Auxiliar de Almacén en Azcapotzalco, CDMX 📦 Sueldo $220 al día más prestaciones de ley. ¿Te interesa?"
  Turnos: Matutino 6am-4pm, Vespertino 1pm-10pm, Nocturno 10pm-7am.

- Cuautitlán Izcalli / El Sabino / Estado de México:
  "Tenemos una vacante de Auxiliar de Almacén en El Sabino, Cuautitlán Izcalli 📦 Sueldo $250 al día más prestaciones de ley. ¿Te interesa?"
  Turnos: Matutino 8am-6pm, Vespertino 11am-10pm, Nocturno 10pm-6am.

- Si la zona no es clara: pregunta si puede trasladarse a Azcapotzalco CDMX o Cuautitlán Izcalli EdoMex.

Si el candidato NO está interesado: agradece amablemente y cierra. No insistas.

════════════════════════════════════════
CLASIFICACIÓN INTERNA
════════════════════════════════════════
El candidato NUNCA ve su clasificación.

- "Nuevo": entrevista en proceso (campos pendientes).
- Al completar TODOS los campos:
  - "Rechazado": sufre_vertigo = true, procesos_legales_antecedentes = tiene antecedentes penales graves, o tiene_botas_casquillo = false Y confirmó que no las conseguirá.
  - "Candidato Óptimo": completó todo, 19-45 años, sin impedimentos críticos.
  - "Pendiente": banco Santander, documento faltante que puede conseguir, edad fuera de rango, o situación dudosa.

════════════════════════════════════════
CIERRE FINAL
════════════════════════════════════════
SOLO cuando CAMPOS QUE FALTAN = NINGUNO:
"Muchas gracias por tu tiempo, [nombre] 🙌 Ya registré toda tu información. Nuestro equipo de reclutamiento se pondrá en contacto contigo pronto. ¡Que tengas excelente día!"

CEDIS interno: "Editorial" = Azcapotzalco, "UPS" = El Sabino, null si no definido.
NUNCA menciones "UPS", "Penguin" ni "Editorial" al candidato.

════════════════════════════════════════
FORMATO DE RESPUESTA
════════════════════════════════════════
RESPONDE ÚNICAMENTE con este JSON, sin texto adicional, sin markdown:
{
  "pregunta": "mensaje al candidato",
  "estatus": "Nuevo | Pendiente | Candidato Óptimo | Rechazado",
  "cedis": "Editorial | UPS | null",
  "extraccion": {
    // SOLO datos nuevos del ÚLTIMO mensaje del candidato.
    // edad, dependientes_economicos, tiempo_traslado_minutos, experiencia_almacen_meses, nivel_salud_percecion → número
    // inconveniente_traslado, tiene_constancias_laborales, problemas_respiratorios, sufre_vertigo, usa_lentes, documentacion_completa_original, tiene_botas_casquillo, es_reingreso → true o false
    // resto → texto corto
  }
}

Campos válidos para extraccion: ${CAMPOS.join(', ')}.
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