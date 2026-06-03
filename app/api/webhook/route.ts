import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import { arisBrain } from '../../lib/aris';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.event !== 'messages.upsert') {
      return NextResponse.json({ status: 'ignored_event' });
    }

    if (body.data?.key?.fromMe === true) {
      return NextResponse.json({ status: 'ignored_fromme' });
    }

    const texto = body.data?.message?.conversation
      || body.data?.message?.extendedTextMessage?.text;
    const tel = body.data?.key?.remoteJid?.split('@')[0];

    if (!texto || !tel) {
      return NextResponse.json({ status: 'ignored_no_text' });
    }

    const rawRespuesta = await arisBrain(texto, tel);
    const objetoIA = JSON.parse(rawRespuesta);
    const ex = objetoIA.extracccion;

    const update: any = {
      telefono_whatsapp: tel,
      estatus: objetoIA.estatus || 'Nuevo'
    };

    if (objetoIA.cedis && objetoIA.cedis !== 'null') {
      update.vacante_cedis = objetoIA.cedis;
    }

    const campos = [
      'nombre_completo', 'edad', 'zona_vivienda', 'estado_civil',
      'dependientes_economicos', 'apoyo_cuidado_hijos', 'tiempo_traslado_minutos',
      'inconveniente_traslado', 'escolaridad_comprobable', 'experiencia_almacen_meses',
      'areas_desempenadas', 'tiene_constancias_laborales', 'nivel_salud_percecion',
      'enfermedades_cronicas', 'lesiones_cirugias', 'alergias', 'esta_embarazada',
      'problemas_respiratorios', 'sufre_vertigo', 'usa_lentes',
      'credito_infonavit_fonacot', 'procesos_legales_antecedentes',
      'documentacion_completa', 'tiene_botas_casquillo', 'referidos_familiares',
      'reingreso', 'banco'
    ];

    campos.forEach(campo => {
      if (ex?.[campo] !== null && ex?.[campo] !== undefined) {
        update[campo] = ex[campo];
      }
    });

    const { error: dbError } = await supabase
      .from('candidatos_respuestas')
      .upsert(update, { onConflict: 'telefono_whatsapp' });

    if (dbError) console.error("DB Error:", dbError.message);

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