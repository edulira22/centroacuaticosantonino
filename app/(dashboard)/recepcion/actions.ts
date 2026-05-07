'use server';

import { createClient } from '@/lib/supabase/server';
import { escribirBitacora } from '@/lib/bitacora';
import { calcularEstatus } from '@/lib/vigencia';
import { revalidatePath } from 'next/cache';
import { format } from 'date-fns';

export interface ResultadoBusqueda {
  id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  numero_credencial: string | null;
  foto_url: string | null;
  estatus: string;
  celular: string | null;
  observaciones: string | null;
  horario_id: string | null;
  paquete_id: string | null;
  horarios: { nombre: string } | null;
  paquetes: { nombre: string; codigo: string | null } | null;
}

// ============================================================
// Buscar usuario por credencial o nombre (para recepción)
// ============================================================
export async function buscarParaRecepcion(query: string): Promise<ResultadoBusqueda[]> {
  if (query.trim().length < 1) return [];

  const supabase = await createClient();

  const { data } = await supabase
    .from('usuarios')
    .select('id, nombre, apellido_paterno, apellido_materno, numero_credencial, foto_url, estatus, celular, observaciones, horario_id, paquete_id, horarios(nombre), paquetes(nombre, codigo)')
    .neq('estatus', 'baja')
    .or(`numero_credencial.ilike.%${query.trim()}%,nombre.ilike.%${query.trim()}%,apellido_paterno.ilike.%${query.trim()}%`)
    .limit(6);

  return (data ?? []) as unknown as ResultadoBusqueda[];
}

// ============================================================
// Registrar asistencia (check-in)
// ============================================================
export async function registrarAsistencia(params: {
  usuario_id: string;
  forzar_duplicado?: boolean;
  observacion_duplicado?: string;
}): Promise<{
  ok: boolean;
  error?: string;
  duplicado?: boolean;
  asistencia_id?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const hoy = format(new Date(), 'yyyy-MM-dd');

  // Verificar asistencia duplicada del día
  const { data: existente } = await supabase
    .from('asistencias')
    .select('id, hora_entrada')
    .eq('usuario_id', params.usuario_id)
    .eq('fecha', hoy)
    .eq('es_duplicado_autorizado', false)
    .maybeSingle();

  if (existente && !params.forzar_duplicado) {
    return {
      ok: false,
      duplicado: true,
      error: `Este usuario ya registró entrada hoy a las ${String(existente.hora_entrada).slice(0, 5)}.`,
    };
  }

  // Calcular estatus real en el momento del check-in
  const vigencia = await calcularEstatus(params.usuario_id);

  const { data, error } = await supabase
    .from('asistencias')
    .insert({
      usuario_id: params.usuario_id,
      fecha: hoy,
      hora_entrada: new Date().toISOString().slice(11), // TIMETZ solo acepta la parte de hora
      estatus_al_momento: vigencia.estatus,
      metodo_registro: 'manual',
      registrado_por: user.id,
      es_duplicado_autorizado: params.forzar_duplicado ?? false,
      observaciones: params.observacion_duplicado ?? null,
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };

  await escribirBitacora({
    usuario_sistema: user.id,
    accion: 'registro_asistencia',
    tabla_afectada: 'asistencias',
    id_registro: data.id,
    valor_anterior: null,
    valor_nuevo: {
      usuario_id: params.usuario_id,
      fecha: hoy,
      estatus_al_momento: vigencia.estatus,
      es_duplicado_autorizado: params.forzar_duplicado ?? false,
    },
  });

  revalidatePath('/recepcion');
  revalidatePath('/asistencias');
  return { ok: true, asistencia_id: data.id };
}
