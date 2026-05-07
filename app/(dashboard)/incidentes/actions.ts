'use server';

import { createClient } from '@/lib/supabase/server';
import { escribirBitacora } from '@/lib/bitacora';
import { revalidatePath } from 'next/cache';

export interface DatosIncidente {
  usuario_id: string;
  fecha: string;
  descripcion: string;
  accion_tomada?: string;
  contacto_avisado?: string;
  observaciones?: string;
}

export async function registrarIncidente(datos: DatosIncidente): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  if (!datos.descripcion.trim()) return { ok: false, error: 'La descripción es requerida' };

  const { data, error } = await supabase
    .from('incidentes_enfermeria')
    .insert({
      usuario_id: datos.usuario_id,
      fecha: datos.fecha,
      descripcion: datos.descripcion.trim(),
      accion_tomada: datos.accion_tomada?.trim() || null,
      contacto_avisado: datos.contacto_avisado?.trim() || null,
      observaciones: datos.observaciones?.trim() || null,
      registrado_por: user.id,
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };

  await escribirBitacora({
    usuario_sistema: user.id,
    accion: 'registro_incidente',
    tabla_afectada: 'incidentes_enfermeria',
    id_registro: data.id,
    valor_anterior: null,
    valor_nuevo: {
      usuario_id: datos.usuario_id,
      fecha: datos.fecha,
      descripcion: datos.descripcion.trim(),
    },
  });

  revalidatePath('/incidentes');
  revalidatePath(`/usuarios/${datos.usuario_id}`);
  return { ok: true, id: data.id };
}
