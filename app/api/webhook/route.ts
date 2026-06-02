import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import { arisBrain } from '../../lib/aris';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mensajeTexto = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text;
    const numeroTelefono = body.data?.key?.remoteJid?.split('@')[0];
    const nombreWhatsApp = body.data?.pushName;

    if (!mensajeTexto || !numeroTelefono) return NextResponse.json({ status: 'No data' });

    // 1. ARIS piensa la respuesta
    const respuestaAris = await arisBrain(mensajeTexto, []);

    // 2. ORDEN DE ENVIAR (La boca de ARIS)
    await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/ARIS`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.EVOLUTION_API_KEY!
      },
      body: JSON.stringify({
        "number": numeroTelefono,
        "text": respuestaAris
      })
    });

    // 3. Guardar en la base de datos
    await supabase.from('candidatos_respuestas').upsert({
      nombre_completo: nombreWhatsApp,
      telefono_whatsapp: numeroTelefono,
      analisis_final_aris: respuestaAris.substring(0, 100),
      estatus: 'Nuevo'
    }, { onConflict: 'telefono_whatsapp' });

    return NextResponse.json({ status: 'success' });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}