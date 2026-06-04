import { NextResponse } from 'next/server';
import { supabase } from '../../lib/supabase';
import { arisBrain } from '../../lib/aris';

async function enviarWhatsApp(tel: string, texto: string) {
  await fetch(`${process.env.EVOLUTION_API_URL}/message/sendText/ARIS`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.EVOLUTION_API_KEY!
    },
    body: JSON.stringify({ number: tel, text: texto })
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.event !== 'messages.upsert') {
      return NextResponse.json({ status: 'ignored_event' });
    }
    if (body.data?.key?.fromMe === true) {
      return NextResponse.json({ status: 'ignored_fromme' });
    }

    const texto: string = body.data?.message?.conversation
      || body.data?.message?.extendedTextMessage?.text
      || '';
    const tel: string = body.data?.key?.remoteJid?.split('@')[0] || '';

    if (!texto || !tel) {
      return NextResponse.json({ status: 'ignored_no_text' });
    }

    const rawRespuesta = await arisBrain(texto, tel);
    const objetoIA = JSON.parse(rawRespuesta);
    const ex = objetoIA.extraccion || {};

    // === GUARDADO 1: lo crítico (memoria + estado). NUNCA debe fallar. ===
    const critico: any = {
      telefono_whatsapp: tel,
      estatus: objetoIA.estatus || 'Nuevo'
    };
    if (objetoIA._historial) critico.historial = JSON.stringify(objetoIA._historial);
    if (objetoIA.cedis && objetoIA.cedis !== 'null') critico.vacante_cedis = objetoIA.cedis;

    const { error: e1 } = await supabase
      .from('candidatos_respuestas')
      .upsert(critico, { onConflict: 'telefono_whatsapp' });
    if (e1) console.error('Error guardando memoria:', e1.message);

    // === GUARDADO 2: los datos extraídos ===
    const campos = [
      'nombre_completo', 'edad', 'zona_vivienda', 'turno_preferido',
      'estado_civil', 'dependientes_economicos', 'apoyo_cuidado_hijos',
      'tiempo_traslado_minutos', 'inconveniente_traslado', 'escolaridad_comprobable',
      'experiencia_almacen_meses', 'areas_desempenadas', 'tiene_constancias_laborales',
      'nivel_salud_percecion', 'enfermedades_cronicas', 'lesiones_cirugias',
      'alergias', 'esta_embarazada', 'problemas_respiratorios', 'sufre_vertigo',
      'usa_lentes', 'credito_infonavit_fonacot', 'procesos_legales_antecedentes',
      'documentacion_completa', 'tiene_botas_casquillo', 'referidos_familiares',
      'reingreso', 'banco'
    ];

    const datos: any = { telefono_whatsapp: tel };
    let hayDatos = false;
    campos.forEach(c => {
      if (ex?.[c] !== null && ex?.[c] !== undefined) {
        datos[c] = ex[c];
        hayDatos = true;
      }
    });

    if (hayDatos) {
      const { error: e2 } = await supabase
        .from('candidatos_respuestas')
        .upsert(datos, { onConflict: 'telefono_whatsapp' });
      if (e2) console.error('Error guardando datos:', e2.message);
    }

    await enviarWhatsApp(tel, objetoIA.pregunta);

    return NextResponse.json({ status: 'success' });

  } catch (error: any) {
    console.error('Route error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}