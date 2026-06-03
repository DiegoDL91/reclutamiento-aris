import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import { arisBrain } from '../../lib/aris';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const texto = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text;
    const tel = body.data?.key?.remoteJid?.split('@')[0];

    if (body.data?.key?.fromMe || !texto) return NextResponse.json({ status: 'ignored' });

    // 1. ARIS piensa
    const respuesta = await arisBrain(texto, tel);

    // 2. MANDA EL WHATSAPP
    await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/ARIS`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': process.env.EVOLUTION_API_KEY! },
      body: JSON.stringify({ "number": tel, "text": respuesta })
    });

    // 3. LOGICA DE EXTRACCIÓN (Guardar el nombre o edad si lo detectamos)
    // Esto es un ejemplo, ARIS guardará el progreso general
    await supabase.from('candidatos_respuestas').upsert({
        telefono_whatsapp: tel,
        nombre_completo: texto.length > 20 ? undefined : texto, // Si es corto, asumimos nombre
        analisis_final_aris: `Candidato respondió: ${texto}`,
        estatus: 'En Proceso'
    }, { onConflict: 'telefono_whatsapp' });

    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}