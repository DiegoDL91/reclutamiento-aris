import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import { arisBrain } from '../../lib/aris';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // DEBUG TEMPORAL - bórralo después
    console.log("EVENTO:", body.event);
    console.log("BODY COMPLETO:", JSON.stringify(body).slice(0, 500));

    if (body.event !== 'messages.upsert') {
      return NextResponse.json({ status: 'ignored_event' });
    }

    const texto = body.data?.message?.conversation 
               || body.data?.message?.extendedTextMessage?.text;
    const tel = body.data?.key?.remoteJid?.split('@')[0];

    if (body.data?.key?.fromMe || !texto || !tel) {
      return NextResponse.json({ status: 'ignored' });
    }

    const rawRespuesta = await arisBrain(texto, tel);
    const objetoIA = JSON.parse(rawRespuesta);

    const ex = objetoIA.extracccion;
    const update: any = { telefono_whatsapp: tel, estatus: 'En Proceso' };
    
    if (ex?.nombre && ex.nombre !== "null") update.nombre_completo = ex.nombre;
    if (ex?.edad && ex.edad !== "null") update.edad = parseInt(ex.edad);
    if (ex?.botas !== null && ex?.botas !== undefined) update.tiene_botas_casquillo = ex.botas;

    const { error: dbError } = await supabase
      .from('candidatos_respuestas')
      .upsert(update, { onConflict: 'telefono_whatsapp' });
    
    if (dbError) console.error("DB Error:", dbError.message, dbError.details);

    await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/ARIS`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'apikey': process.env.EVOLUTION_API_KEY! 
      },
      body: JSON.stringify({ number: tel, text: objetoIA.pregunta })
    });

    return NextResponse.json({ status: 'success' });

  } catch (error: any) {
    console.error("Route error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}