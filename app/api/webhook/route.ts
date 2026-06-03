import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import { arisBrain } from '../../lib/aris';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const texto = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text;
    const tel = body.data?.key?.remoteJid?.split('@')[0];

    if (body.data?.key?.fromMe || !texto) return NextResponse.json({ status: 'ignored' });

    // 1. ARIS analiza el mensaje
    const rawRespuesta = await arisBrain(texto, tel);
    const objetoIA = JSON.parse(rawRespuesta);

    // 2. Mapeamos los datos detectados a la base de datos
    const d = objetoIA.datos_detectados;
    const updateData: any = { 
        telefono_whatsapp: tel,
        estatus: 'En Proceso'
    };

    if (d.nombre) updateData.nombre_completo = d.nombre;
    if (d.edad) updateData.edad = parseInt(d.edad);
    if (d.botas !== null) updateData.tiene_botas_casquillo = d.botas;

    // Guardamos en Supabase
    await supabase.from('candidatos_respuestas').upsert(updateData, { onConflict: 'telefono_whatsapp' });

    // 3. Mandamos la respuesta a WhatsApp
    await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/ARIS`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': process.env.EVOLUTION_API_KEY! },
      body: JSON.stringify({ "number": tel, "text": objetoIA.respuesta_whatsapp })
    });

    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}