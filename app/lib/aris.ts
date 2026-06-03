import { supabase } from './supabase';

export const arisBrain = async (mensajeUsuario: string, telefono: string) => {

  const { data: info } = await supabase
    .from('candidatos_respuestas')
    .select('*')
    .eq('telefono_whatsapp', telefono)
    .maybeSingle();

  const msg = mensajeUsuario.toLowerCase().trim();

  // Extracción simple sin IA
  let nombre = null;
  let edad = null;
  let botas = null;

  // Detectar nombre
  if (!info?.nombre_completo) {
    // Cualquier mensaje que no sea solo "hola" lo tomamos como nombre
    if (msg !== 'hola' && msg !== 'hi' && msg !== 'buenas' && msg.length > 2) {
      nombre = mensajeUsuario.trim();
    }
  }

  // Detectar edad
  if (info?.nombre_completo && !info?.edad) {
    const num = parseInt(msg);
    if (!isNaN(num) && num > 10 && num < 80) {
      edad = num.toString();
    }
  }

  // Detectar botas
  if (info?.nombre_completo && info?.edad) {
    if (msg.includes('si') || msg.includes('sí') || msg.includes('tengo')) {
      botas = true;
    } else if (msg.includes('no')) {
      botas = false;
    }
  }

  // Decidir pregunta
  let pregunta = '';
  const nombreFinal = nombre || info?.nombre_completo;
  const edadFinal = edad || info?.edad;

  if (!nombreFinal) {
    pregunta = '¡Hola! Soy ARIS de Rio Logística. ¿Cuál es tu nombre completo?';
  } else if (!edadFinal) {
    pregunta = `Mucho gusto ${nombreFinal}. ¿Cuántos años tienes?`;
  } else if (botas === null && !info?.tiene_botas_casquillo) {
    pregunta = '¿Cuentas con botas de casquillo?';
  } else {
    pregunta = '¡Perfecto! Hemos registrado tu información. El equipo de Rio Logística te contactará pronto. 🎉';
  }

  return JSON.stringify({
    pregunta,
    extracccion: { nombre, edad, botas }
  });
};