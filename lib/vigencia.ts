import { createClient } from '@/lib/supabase/server';
import type { EstatusUsuario, EstatusVigencia } from '@/types/database';
import { startOfMonth, format } from 'date-fns';

/**
 * Calcula el estatus real de un usuario en tiempo real.
 * La vigencia es por MES CALENDARIO: existe un pago activo (no anulado)
 * cuyo periodo_mes corresponde al mes actual.
 * NUNCA se almacena este valor — siempre se recalcula al consultar.
 */
export async function calcularEstatus(usuario_id: string): Promise<EstatusVigencia> {
  const supabase = await createClient();
  const hoy = new Date();
  const mesActual = format(startOfMonth(hoy), 'yyyy-MM-dd');

  // Verificar si el usuario tiene estatus permanente (baja/suspendido)
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('estatus, fecha_baja')
    .eq('id', usuario_id)
    .single();

  const estatusPermanente = usuario?.estatus as EstatusUsuario | undefined;
  if (estatusPermanente === 'baja' || estatusPermanente === 'suspendido') {
    return {
      estatus: estatusPermanente,
      vigente_hasta: null,
      ultimo_pago: null,
      dias_vencido: 0,
    };
  }

  // Buscar pago vigente del mes actual (no anulado, periodo >= mes actual)
  const { data: pagoActual } = await supabase
    .from('pagos')
    .select('fecha_pago, monto, numero_recibo, fecha_fin, periodo_mes')
    .eq('usuario_id', usuario_id)
    .eq('anulado', false)
    .gte('periodo_mes', mesActual)
    .order('periodo_mes', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Último pago registrado (para mostrar en ficha aunque esté vencido)
  const { data: ultimoPago } = await supabase
    .from('pagos')
    .select('fecha_pago, monto, numero_recibo')
    .eq('usuario_id', usuario_id)
    .eq('anulado', false)
    .order('fecha_pago', { ascending: false })
    .limit(1)
    .maybeSingle();

  const ultimoPagoFormateado = ultimoPago
    ? {
        fecha: ultimoPago.fecha_pago,
        monto: Number(ultimoPago.monto),
        numero_recibo: ultimoPago.numero_recibo,
      }
    : null;

  if (pagoActual) {
    return {
      estatus: 'activo',
      vigente_hasta: pagoActual.fecha_fin,
      ultimo_pago: ultimoPagoFormateado,
      dias_vencido: 0,
    };
  }

  // Sin pago del mes actual — calcular días vencido
  let diasVencido = 0;
  if (ultimoPago?.fecha_pago) {
    const fechaUltimoPago = new Date(ultimoPago.fecha_pago);
    diasVencido = Math.max(
      0,
      Math.floor((hoy.getTime() - fechaUltimoPago.getTime()) / 86_400_000) - 30
    );
  }

  return {
    estatus: 'vencido',
    vigente_hasta: null,
    ultimo_pago: ultimoPagoFormateado,
    dias_vencido: diasVencido,
  };
}

/**
 * Función central de check-in — agnóstica al método de identificación.
 * Preparada para QR, NFC y biométrico en fases futuras.
 */
export async function resolverUsuario(
  identificador: string,
  metodo: 'manual' | 'qr' | 'nfc' | 'biometrico' | 'lector_codigo'
) {
  const supabase = await createClient();

  if (metodo === 'qr' || metodo === 'nfc') {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('qr_token', identificador)
      .maybeSingle();
    return data;
  }

  if (metodo === 'biometrico') {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('biometric_id', identificador)
      .maybeSingle();
    return data;
  }

  // manual / lector_codigo: buscar por número de credencial
  const { data } = await supabase
    .from('usuarios')
    .select('*')
    .eq('numero_credencial', identificador)
    .maybeSingle();
  return data;
}
