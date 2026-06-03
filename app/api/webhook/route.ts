import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import { arisBrain } from '../../lib/aris';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const texto = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text;
    const tel = body.data?.key?.remoteJid?.split('@')[0];

    if (body.data?.key?.fromMe || !texto) return NextResponse.json({ status: 'ignored' });

    // 1. ARIS procesa
    const rawRespuesta = await arisBrain(texto, tel);
    const objetoIA = JSON.parse(rawRespuesta);

    // 2. Guardar datos extraídos (IMPORTANTE: Mapear a las columnas reales)
    const d = objetoIA.datos;
    
    // Solo guardamos si la IA detectó algo nuevo
    const updates: any = { telefono_whatsapp: tel, estatus: 'En Proceso' };
    if (d.nombre_completo) updates.nombre_completo = d.nombre_completo;
    if (d.edad) updates.edad = parseInt(d.edad);
    if (d.tiene_botas_casquillo !== null) updates.tiene_botas_casquillo = d.tiene_botas_casquillo;

    await supabase.from('candidatos_respuestas').upsert(updates, { onConflict: 'telefono_whatsapp' });

    // 3. Mandar respuesta a WhatsApp
    await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/ARIS`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': process.env.EVOLUTION_API_KEY! },
      body: JSON.stringify({ "number": tel, "text": objetoIA.pregunta })
    });

    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    console.error("ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}