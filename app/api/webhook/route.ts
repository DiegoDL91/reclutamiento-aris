import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import { arisBrain } from '../../lib/aris';

const BOOL_FIELDS = new Set(['inconveniente_traslado', 'tiene_constancias_laborales', 'problemas_respiratorios', 'sufre_vertigo', 'usa_lentes', 'documentacion_completa_original', 'tiene_botas_casquillo', 'es_reingreso']);
const INT_FIELDS = new Set(['edad', 'tiempo_traslado_minutos', 'experiencia_almacen_meses', 'nivel_salud_percecion', 'dependientes_economicos']);

const coerce = (campo: string, val: any): any => {
  if (val === null || val === undefined || val === 'null') return null;
  const s = String(val).toLowerCase().trim();
  if (BOOL_FIELDS.has(campo)) {
    if (typeof val === 'boolean') return val;
    return ['si','sí','yes','true','1'].includes(s);
  }
  if (INT_FIELDS.has(campo)) {
    const n = parseInt(s);
    return isNaN(n) ? null : n;
  }
  return val;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body.event !== 'messages.upsert' || body.data?.key?.fromMe) return NextResponse.json({ status: 'ignored' });
    const texto = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || '';
    const tel = body.data?.key?.remoteJid?.split('@')[0] || '';

    const rawRespuesta = await arisBrain(texto, tel);
    const objetoIA = JSON.parse(rawRespuesta);
    const ex = objetoIA.extraccion || {};

    const datos: any = { 
      telefono_whatsapp: tel, 
      estatus: objetoIA.estatus || 'Pendientes',
      historial: JSON.stringify(objetoIA._historial)
    };
    if (objetoIA.cedis && objetoIA.cedis !== 'null') datos.vacante_cedis = objetoIA.cedis;

    const campos = ['nombre_completo', 'edad', 'zona_vivienda', 'turno_preferido', 'estado_civil', 'dependientes_economicos', 'apoyo_cuidado_dependientes', 'tiempo_traslado_minutos', 'inconveniente_traslado', 'escolaridad_comprobable', 'experiencia_almacen_meses', 'areas_desempenadas', 'motivo_salida_anterior', 'tiene_constancias_laborales', 'nivel_salud_percecion', 'enfermedades_cronicas', 'lesiones_o_cirugias', 'alergias', 'problemas_respiratorios', 'sufre_vertigo', 'usa_lentes', 'credito_infonavit_fonacot', 'procesos_legales_antecedentes', 'documentacion_completa_original', 'tiene_botas_casquillo', 'tipo_calzado_actual', 'referidos_familiares_nombres', 'es_reingreso', 'cuenta_banco_santander_problemas'];

    campos.forEach(c => {
      if (ex[c] !== undefined && ex[c] !== null) datos[c] = coerce(c, ex[c]);
    });

    await supabase.from('candidatos_respuestas').upsert(datos, { onConflict: 'telefono_whatsapp' });
    
    await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/ARIS`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': process.env.EVOLUTION_API_KEY! },
      body: JSON.stringify({ number: tel, text: objetoIA.pregunta })
    });

    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}