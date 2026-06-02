import { NextResponse } from 'next/server';
// Subimos 2 niveles: de webhook -> api -> app, y entramos a lib
import { supabase } from '../../lib/supabase';
import { arisBrain } from '../../lib/aris';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Extraemos los datos del mensaje de WhatsApp
    const mensajeTexto = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text;
    const numeroTelefono = body.data?.key?.remoteJid?.split('@')[0];
    const nombreWhatsApp = body.data?.pushName;

    if (!mensajeTexto || !numeroTelefono) {
      return NextResponse.json({ status: 'No message data' });
    }

    // 2. Buscamos al candidato en la tabla real
    const { data: candidato } = await supabase
      .from('candidatos_respuestas')
      .select('*')
      .eq('telefono_whatsapp', numeroTelefono)
      .single();

    // 3. Respuesta de ARIS (Pasamos el mensaje para que piense)
    const respuestaAris = await arisBrain(mensajeTexto, []);

    // 4. Si es un candidato que no conocíamos, lo registramos
    if (!candidato) {
      await supabase.from('candidatos_respuestas').insert({
        nombre_completo: nombreWhatsApp,
        telefono_whatsapp: numeroTelefono,
        analisis_final_aris: 'Entrevista iniciada por WhatsApp',
        estatus: 'Nuevo'
      });
    }

    // Respuesta para el puente de WhatsApp
    return NextResponse.json({ 
      status: 'success', 
      reply: respuestaAris 
    });

  } catch (error: any) {
    console.error('Error en Webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}