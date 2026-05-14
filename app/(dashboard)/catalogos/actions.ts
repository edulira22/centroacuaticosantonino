'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// ============================================================
// PARÁMETROS DEL SISTEMA
// ============================================================
export async function actualizarParametro(
  id: string,
  valor: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from('parametros_sistema')
    .update({ valor, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/catalogos');
  return { ok: true };
}

export async function crearParametro(datos: {
  clave: string;
  valor: string;
  tipo: 'numero' | 'texto';
  descripcion: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const clave = datos.clave.trim().toLowerCase().replace(/\s+/g, '_');
  const { error } = await supabase
    .from('parametros_sistema')
    .insert({ clave, valor: datos.valor, tipo: datos.tipo, descripcion: datos.descripcion, es_sistema: false });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/catalogos');
  return { ok: true };
}

export async function eliminarParametro(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  // Solo se puede borrar si es_sistema = false
  const { error } = await supabase
    .from('parametros_sistema')
    .delete()
    .eq('id', id)
    .eq('es_sistema', false);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/catalogos');
  return { ok: true };
}

// ============================================================
// PAQUETES
// ============================================================
export async function actualizarPaquete(
  id: string,
  datos: { nombre?: string; codigo?: string; precio_base?: number; requiere_autorizacion?: boolean; activo?: boolean },
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('paquetes').update(datos).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/catalogos');
  return { ok: true };
}

export async function crearPaquete(datos: {
  nombre: string;
  codigo: string;
  precio_base: number;
  requiere_autorizacion: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('paquetes').insert({ ...datos, activo: true, duracion_dias: 30 });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/catalogos');
  return { ok: true };
}

// ============================================================
// HORARIOS
// ============================================================
export async function actualizarHorario(
  id: string,
  datos: { activo?: boolean; nombre?: string; hora_inicio?: string; hora_fin?: string },
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('horarios').update(datos).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/catalogos');
  return { ok: true };
}

export async function crearHorario(datos: {
  hora_inicio: string;
  hora_fin: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const nombre = `${datos.hora_inicio}-${datos.hora_fin}`;
  const { error } = await supabase.from('horarios').insert({ ...datos, nombre, activo: true });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/catalogos');
  return { ok: true };
}

// ============================================================
// MÉTODOS DE PAGO
// ============================================================
export async function toggleMetodoPago(
  id: string,
  activo: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('metodos_pago').update({ activo }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/catalogos');
  return { ok: true };
}

export async function crearMetodoPago(nombre: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from('metodos_pago').insert({ nombre, activo: true });
  if (error) return { ok: false, error: error.message };
  revalidatePath('/catalogos');
  return { ok: true };
}
