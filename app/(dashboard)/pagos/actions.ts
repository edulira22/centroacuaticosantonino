'use server';

import { createClient } from '@/lib/supabase/server';
import { escribirBitacora } from '@/lib/bitacora';
import { revalidatePath } from 'next/cache';
import { startOfMonth, endOfMonth, format, parseISO } from 'date-fns';

export interface DatosRegistroPago {
  usuario_id: string;
  fecha_pago: string;           // ISO date
  monto: number;
  paquete_id: string;
  periodo_mes: string;          // ISO date: primer día del mes (ej. "2025-05-01")
  fecha_inicio: string;         // ISO date
  fecha_fin: string;            // ISO date
  numero_recibo: string;
  metodo_pago_id: string;
  observaciones: string;
}

// ============================================================
// Registrar pago
// ============================================================
export async function registrarPago(datos: DatosRegistroPago): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  // Verificar si ya existe un pago no anulado para ese período
  const { data: pagoExistente } = await supabase
    .from('pagos')
    .select('id, numero_recibo, periodo_mes')
    .eq('usuario_id', datos.usuario_id)
    .eq('periodo_mes', datos.periodo_mes)
    .eq('anulado', false)
    .maybeSingle();

  if (pagoExistente) {
    return {
      ok: false,
      error: `Ya existe un pago activo para ese período (recibo: ${pagoExistente.numero_recibo ?? 'sin número'}).`,
    };
  }

  const { data, error } = await supabase
    .from('pagos')
    .insert({
      usuario_id: datos.usuario_id,
      fecha_pago: datos.fecha_pago,
      monto: datos.monto,
      paquete_id: datos.paquete_id,
      periodo_mes: datos.periodo_mes,
      fecha_inicio: datos.fecha_inicio,
      fecha_fin: datos.fecha_fin,
      numero_recibo: datos.numero_recibo || null,
      metodo_pago_id: datos.metodo_pago_id || null,
      registrado_por: user.id,
      observaciones: datos.observaciones || null,
      anulado: false,
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };

  // Si el usuario estaba como 'pendiente' o 'vencido', actualizarlo a 'activo'
  await supabase
    .from('usuarios')
    .update({ estatus: 'activo' })
    .eq('id', datos.usuario_id)
    .in('estatus', ['pendiente', 'vencido']);

  await escribirBitacora({
    usuario_sistema: user.id,
    accion: 'registro_pago',
    tabla_afectada: 'pagos',
    id_registro: data.id,
    valor_anterior: null,
    valor_nuevo: {
      usuario_id: datos.usuario_id,
      monto: datos.monto,
      periodo_mes: datos.periodo_mes,
      numero_recibo: datos.numero_recibo,
    },
  });

  revalidatePath(`/usuarios/${datos.usuario_id}`);
  revalidatePath('/pagos');
  return { ok: true, id: data.id };
}

// ============================================================
// Anular pago (nunca DELETE)
// ============================================================
export async function anularPago(
  pago_id: string,
  motivo: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { data: anterior } = await supabase
    .from('pagos')
    .select('*, usuarios(id, estatus)')
    .eq('id', pago_id)
    .single();

  if (!anterior) return { ok: false, error: 'Pago no encontrado' };
  if (anterior.anulado) return { ok: false, error: 'El pago ya está anulado' };

  const { error } = await supabase
    .from('pagos')
    .update({
      anulado: true,
      anulado_por: user.id,
      anulado_at: new Date().toISOString(),
      motivo_anulacion: motivo,
    })
    .eq('id', pago_id);

  if (error) return { ok: false, error: error.message };

  await escribirBitacora({
    usuario_sistema: user.id,
    accion: 'anulacion_pago',
    tabla_afectada: 'pagos',
    id_registro: pago_id,
    valor_anterior: { anulado: false, monto: anterior.monto, periodo_mes: anterior.periodo_mes },
    valor_nuevo: { anulado: true, motivo_anulacion: motivo },
    motivo,
  });

  revalidatePath(`/usuarios/${anterior.usuario_id}`);
  revalidatePath('/pagos');
  return { ok: true };
}

// ============================================================
// Helpers de cálculo de fechas para el formulario
// ============================================================
export function calcularPeriodo(mesISO: string): {
  periodo_mes: string;
  fecha_inicio: string;
  fecha_fin: string;
} {
  const fecha = parseISO(mesISO);
  return {
    periodo_mes: format(startOfMonth(fecha), 'yyyy-MM-dd'),
    fecha_inicio: format(startOfMonth(fecha), 'yyyy-MM-dd'),
    fecha_fin:    format(endOfMonth(fecha), 'yyyy-MM-dd'),
  };
}
