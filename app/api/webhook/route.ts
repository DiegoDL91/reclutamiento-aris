import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import { arisBrain } from '../../lib/aris';

const BOOL_FIELDS = new Set([
  'inconveniente_traslado', 'tiene_constancias_laborales', 'problemas_respiratorios',
  'sufre_vertigo', 'usa_lentes', 'documentacion_completa_original',
  'tiene_botas_casquillo', 'es_reingreso'
]);

const INT_FIELDS = new Set([
  'edad', 'tiempo_traslado_minutos', 'experiencia_almacen_meses', 'nivel_salud_percecion', 'dependientes_economicos'
]);

const coerce = (campo: string, val: any): any => {
  if (val === null || val === undefined || val === 'null') return null;
  const s = String(val).toLowerCase().trim();

  if (BOOL_FIELDS.has(campo)) {
    if (typeof val === 'boolean') return val;
    if (['si','sí','yes','true','1'].includes(s)) return true;
    if (['no','false','0','nel','nop'].includes(s)) return false;
    return null;
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
    if (body.event !== 'messages.upsert' || body.data?.key?.fromMe) return NextResponse.json({ status: 'ignored' });

    const texto = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || '';
    const tel = body.data?.key?.remoteJid?.split('@')[0] || '';

    if (!texto || !tel) return NextResponse.json({ status: 'no_data' });

    // 1. Obtener respuesta de la IA
    const rawRespuesta = await arisBrain(texto, tel);
    const objetoIA = JSON.parse(rawRespuesta);
    const ex = objetoIA.extraccion || {};

    // 2. Preparar el objeto de datos unificado
    const datosParaGuardar: any = { 
      telefono_whatsapp: tel, 
      estatus: objetoIA.estatus || 'Pendientes' 
    };

    if (objetoIA._historial) datosParaGuardar.historial = JSON.stringify(objetoIA._historial);
    if (objetoIA.cedis && objetoIA.cedis !== 'null') datosParaGuardar.vacante_cedis = objetoIA.cedis;

    // Mapear los campos extraídos con limpieza (coerce)
    Object.keys(ex).forEach(key => {
      const valorLimpio = coerce(key, ex[key]);
      if (valorLimpio !== null) {
        datosParaGuardar[key] = valorLimpio;
      }
    });

    // 3. Un solo guardado en Supabase (Eficiencia Stark)
    const { error } = await supabase
      .from('candidatos_respuestas')
      .upsert(datosParaGuardar, { onConflict: 'telefono_whatsapp' });

    if (error) console.error('Error DB:', error.message);

    // 4. Enviar a WhatsApp
    await enviarWhatsApp(tel, objetoIA.pregunta);

    return NextResponse.json({ status: 'success' });

  } catch (error: any) {
    console.error('Webhook Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}