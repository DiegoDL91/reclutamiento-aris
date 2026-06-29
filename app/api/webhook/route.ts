import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import { arisBrain } from '../../lib/aris';

const BOOL_FIELDS = new Set([
  'inconveniente_traslado', 'tiene_constancias_laborales', 'problemas_respiratorios',
  'sufre_vertigo', 'usa_lentes', 'documentacion_completa_original',
  'tiene_botas_casquillo', 'es_reingreso'
]);

const INT_FIELDS = new Set([
  'edad', 'tiempo_traslado_minutos', 'experiencia_almacen_meses', 'nivel_salud_percecion'
]);

const coerce = (campo: string, val: any): any => {
  if (val === null || val === undefined) return null;
  const s = String(val).toLowerCase().trim();

  if (BOOL_FIELDS.has(campo)) {
    if (typeof val === 'boolean') return val;
    if (['si','sí','yes','true','1','verdadero'].includes(s)) return true;
    if (['no','false','0','falso','nel','nop'].includes(s)) return false;
    return null;
  }

  // dependientes: integer, maneja texto libre
  if (campo === 'dependientes_economicos') {
    if (typeof val === 'number') return Math.round(val);
    // 0 ya viene forzado desde aris.ts para negativos
    const n = parseInt(s);
    return isNaN(n) ? 1 : n; // si no parsea (ej: "mi mamá"), asume 1
  }

  if (INT_FIELDS.has(campo)) {
    const n = parseInt(s);
    return isNaN(n) ? null : n;
  }

  return val;
};

async function enviarWhatsApp(tel: string, texto: string) {
  await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/ARIS`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'apikey': process.env.EVOLUTION_API_KEY! },
    body: JSON.stringify({ number: tel, text: texto })
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.event !== 'messages.upsert') return NextResponse.json({ status: 'ignored_event' });
    if (body.data?.key?.fromMe === true) return NextResponse.json({ status: 'ignored_fromme' });

    const texto: string = body.data?.message?.conversation
      || body.data?.message?.extendedTextMessage?.text || '';
    const tel: string = body.data?.key?.remoteJid?.split('@')[0] || '';

    if (!texto || !tel) return NextResponse.json({ status: 'ignored_no_text' });

    const rawRespuesta = await arisBrain(texto, tel);
    const objetoIA = JSON.parse(rawRespuesta);
    const ex = objetoIA.extraccion || {};

    // GUARDADO 1: crítico
    const critico: any = { telefono_whatsapp: tel, estatus: objetoIA.estatus || 'Nuevo' };
    if (objetoIA._historial) critico.historial = JSON.stringify(objetoIA._historial);
    if (objetoIA.cedis && objetoIA.cedis !== 'null') critico.vacante_cedis = objetoIA.cedis;

    const { error: e1 } = await supabase
      .from('candidatos_respuestas')
      .upsert(critico, { onConflict: 'telefono_whatsapp' });
    if (e1) console.error('Error guardando memoria:', e1.message);

    // GUARDADO 2: datos extraídos
    const campos = [
      'nombre_completo', 'edad', 'zona_vivienda', 'turno_preferido',
      'estado_civil', 'dependientes_economicos', 'apoyo_cuidado_dependientes',
      'tiempo_traslado_minutos', 'inconveniente_traslado', 'escolaridad_comprobable',
      'experiencia_almacen_meses', 'areas_desempenadas', 'motivo_salida_anterior',
      'tiene_constancias_laborales', 'nivel_salud_percecion', 'enfermedades_cronicas',
      'lesiones_o_cirugias', 'alergias', 'problemas_respiratorios', 'sufre_vertigo',
      'usa_lentes', 'credito_infonavit_fonacot', 'procesos_legales_antecedentes',
      'documentacion_completa_original', 'tiene_botas_casquillo', 'tipo_calzado_actual',
      'referidos_familiares_nombres', 'es_reingreso', 'cuenta_banco_santander_problemas'
    ];

    const datos: any = { telefono_whatsapp: tel };
    let hayDatos = false;

    campos.forEach(c => {
      if (ex?.[c] !== null && ex?.[c] !== undefined) {
        const valor = coerce(c, ex[c]);
        if (valor !== null && valor !== undefined) {
          datos[c] = valor;
          hayDatos = true;
        }
      }
    });

    if (hayDatos) {
      const { error: e2 } = await supabase
        .from('candidatos_respuestas')
        .upsert(datos, { onConflict: 'telefono_whatsapp' });
      if (e2) console.error('Error guardando datos:', e2.message, JSON.stringify(datos));
    } else {
      console.log('Sin datos que guardar. extraccion:', JSON.stringify(ex));
    }

    await enviarWhatsApp(tel, objetoIA.pregunta);
    return NextResponse.json({ status: 'success' });

  } catch (error: any) {
    console.error('Route error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
