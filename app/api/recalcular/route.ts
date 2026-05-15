import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/recalcular
 *
 * Ejecuta el recálculo de estatus de todos los socios si no se ha
 * hecho hoy. Llamado desde el layout cliente cuando detecta que
 * es un día nuevo. La función SQL es SECURITY DEFINER y funciona
 * con cualquier rol autenticado.
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('recalcular_si_es_nuevo_dia');

    if (error) {
      console.error('[recalcular] Error en RPC:', error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, recalculo: data });
  } catch (err) {
    console.error('[recalcular] Error inesperado:', err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
