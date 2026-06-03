import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import { arisBrain } from '../../lib/aris';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mensajeTexto = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text;
    const numeroTelefono = body.data?.key?.remoteJid?.split('@')[0];

    if (body.data?.key?.fromMe || !mensajeTexto) return NextResponse.json({ status: 'ignored' });

    // 1. ARIS piensa usando el teléfono como llave de su memoria
    const respuestaAris = await arisBrain(mensajeTexto, numeroTelefono);

    // 2. ENVIAR de regreso a WhatsApp
    await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/ARIS`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.EVOLUTION_API_KEY!
      },
      body: JSON.stringify({ "number": numeroTelefono, "text": respuestaAris })
    });

    // 3. ACTUALIZAR BASE DE DATOS (Guardar lo nuevo que ARIS aprendió)
    // Aquí es donde el sistema "aprende"
    if (mensajeTexto.length > 2) {
        await supabase.from('candidatos_respuestas').upsert({
            telefono_whatsapp: numeroTelefono,
            analisis_final_aris: `Último msj: ${mensajeTexto}`,
            estatus: 'En Proceso'
        }, { onConflict: 'telefono_whatsapp' });
    }

    return NextResponse.json({ status: 'success' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}