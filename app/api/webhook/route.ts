import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import { arisBrain } from '../../lib/aris';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Extraemos los datos básicos
    const mensajeTexto = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text;
    const isStatus = body.event === "messages.upsert"; 
    const fromMe = body.data?.key?.fromMe;

    // Si no es un mensaje real o lo mandó la IA, ignoramos
    if (!isStatus || fromMe || !mensajeTexto) {
      return NextResponse.json({ status: 'ignored' });
    }

    const numeroTelefono = body.data?.key?.remoteJid?.split('@')[0];
    const nombreWhatsApp = body.data?.pushName || 'Candidato Nuevo';

    // 2. ARIS piensa la respuesta (Aquí corregimos el error, quitamos el [])
    const respuestaAris = await arisBrain(mensajeTexto);

    // 3. ENVIAR de regreso a WhatsApp
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

    // 4. Guardar en la base de datos
    await supabase.from('candidatos_respuestas').upsert({
      nombre_completo: nombreWhatsApp,
      telefono_whatsapp: numeroTelefono,
      analisis_final_aris: respuestaAris.substring(0, 100),
      estatus: 'Nuevo'
    }, { onConflict: 'telefono_whatsapp' });

    return NextResponse.json({ status: 'success' });

  } catch (error: any) {
    console.error('ERROR EN WEBHOOK:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}