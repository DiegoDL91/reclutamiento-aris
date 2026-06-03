import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import { arisBrain } from '../../lib/aris';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const texto = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text;
    const tel = body.data?.key?.remoteJid?.split('@')[0];

    if (body.data?.key?.fromMe || !texto) return NextResponse.json({ status: 'ignored' });

    // 1. ARIS analiza
    const rawRespuesta = await arisBrain(texto, tel);
    const objetoIA = JSON.parse(rawRespuesta);

    // 2. GUARDADO DINÁMICO (Aquí está la solución)
    const ex = objetoIA.extracccion;
    const update: any = { telefono_whatsapp: tel, estatus: 'En Proceso' };
    
    if (ex.nombre && ex.nombre !== "null") update.nombre_completo = ex.nombre;
    if (ex.edad && ex.edad !== "null") update.edad = parseInt(ex.edad);
    if (ex.botas !== null) update.tiene_botas_casquillo = ex.botas;

    // Guardamos a huevo en la base de datos
    const { error: dbError } = await supabase.from('candidatos_respuestas').upsert(update, { onConflict: 'telefono_whatsapp' });
    
    if (dbError) console.error("Error guardando en DB:", dbError.message);

    // 3. Mandamos el WhatsApp
    await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/ARIS`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': process.env.EVOLUTION_API_KEY! },
      body: JSON.stringify({ "number": tel, "text": objetoIA.pregunta })
    });

    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}