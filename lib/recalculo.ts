import { createClient } from '@/lib/supabase/server';

/**
 * Verifica si el estatus de los socios necesita recalcularse hoy.
 * Usa una función SQL SECURITY DEFINER para que funcione con
 * cualquier rol (recepcion, admin, superadmin).
 * Costo: ~5ms (una sola consulta SQL).
 */
export async function necesitaRecalculo(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc('necesita_recalculo_hoy');
    return data === true;
  } catch {
    return false; // Si falla, no mostrar pantalla de carga
  }
}
