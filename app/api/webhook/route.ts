import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import { arisBrain } from '../../lib/aris';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const texto = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text;
    const tel = body.data?.key?.remoteJid?.split('@')[0];

    if (body.data?.key?.fromMe || !texto) return NextResponse.json({ status: 'ignored' });

    // 1. ARIS procesa y nos da un JSON
    const rawRespuesta = await arisBrain(texto, tel);
    const limpia = rawRespuesta.replace(/```json|```/g, "").trim();
    const objetoIA = JSON.parse(limpia);

    // 2. Manda la respuesta a WhatsApp
    await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/ARIS`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': process.env.EVOLUTION_API_KEY! },
      body: JSON.stringify({ "number": tel, "text": objetoIA.pregunta })
    });

    // 3. ¡AQUÍ SE GUARDA EN LAS COLUMNAS!
    const d = objetoIA.datos;
    await supabase.from('candidatos_respuestas').upsert({
        telefono_whatsapp: tel,
        nombre_completo: d.nombre_completo || undefined,
        edad: d.edad ? parseInt(d.edad) : undefined,
        tiene_botas_casquillo: d.tiene_botas_casquillo ?? undefined,
        analisis_final_aris: `ARIS procesando...`,
        estatus: 'Nuevo'
    }, { onConflict: 'telefono_whatsapp' });

    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    console.error("ERROR WEBHOOK:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}