'use server';

import { createClient } from '@/lib/supabase/server';
import { escribirBitacora } from '@/lib/bitacora';
import { revalidatePath } from 'next/cache';
import type { FormularioAlta, EstatusUsuario } from '@/types/database';

// ============================================================
// Crear usuario — con detección de duplicados
// ============================================================
export async function crearUsuario(datos: FormularioAlta): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
  duplicados?: { id: string; nombre: string; apellido_paterno: string; fecha_nacimiento: string | null }[];
}> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  // Verificar duplicados: mismo nombre + apellido + fecha_nacimiento
  const { data: posiblesDuplicados } = await supabase
    .from('usuarios')
    .select('id, nombre, apellido_paterno, fecha_nacimiento, estatus')
    .ilike('nombre', datos.nombre.trim())
    .ilike('apellido_paterno', datos.apellido_paterno.trim())
    .neq('estatus', 'baja');

  if (posiblesDuplicados && posiblesDuplicados.length > 0) {
    const matchExacto = posiblesDuplicados.filter(
      (u) => u.fecha_nacimiento === (datos.fecha_nacimiento || null)
    );
    if (matchExacto.length > 0) {
      return { ok: false, error: 'duplicado', duplicados: matchExacto };
    }
    // Match parcial (solo nombre, sin fecha)
    if (posiblesDuplicados.length > 0) {
      return { ok: false, error: 'posible_duplicado', duplicados: posiblesDuplicados };
    }
  }

  return crearUsuarioForzado(datos, user.id);
}

// ============================================================
// Crear usuario forzado (después de confirmar duplicado)
// ============================================================
export async function crearUsuarioForzado(datos: FormularioAlta, usuarioSistemaId?: string): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
}> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  const registradoPor = usuarioSistemaId ?? user?.id;
  if (!registradoPor) return { ok: false, error: 'No autenticado' };

  const { data, error } = await supabase
    .from('usuarios')
    .insert({
      nombre: datos.nombre.trim(),
      apellido_paterno: datos.apellido_paterno.trim(),
      apellido_materno: datos.apellido_materno?.trim() || null,
      fecha_nacimiento: datos.fecha_nacimiento || null,
      sexo: datos.sexo || null,
      celular: datos.celular?.trim() || null,
      servicio_medico: datos.servicio_medico || null,
      contacto_emergencia_nombre: datos.contacto_emergencia_nombre?.trim() || null,
      contacto_emergencia_celular: datos.contacto_emergencia_celular?.trim() || null,
      contacto_emergencia_parentesco: datos.contacto_emergencia_parentesco?.trim() || null,
      horario_id: datos.horario_id || null,
      paquete_id: datos.paquete_id || null,
      observaciones: datos.observaciones?.trim() || null,
      estatus: 'pendiente',
      fecha_inscripcion: new Date().toISOString().split('T')[0],
      registrado_por: registradoPor,
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };

  await escribirBitacora({
    usuario_sistema: registradoPor,
    accion: 'alta_usuario',
    tabla_afectada: 'usuarios',
    id_registro: data.id,
    valor_anterior: null,
    valor_nuevo: { nombre: datos.nombre, apellido_paterno: datos.apellido_paterno, estatus: 'pendiente' },
  });

  revalidatePath('/usuarios');
  return { ok: true, id: data.id };
}

// ============================================================
// Editar datos del usuario
// ============================================================
export async function editarUsuario(
  id: string,
  cambios: Partial<FormularioAlta> & { numero_credencial?: string }
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  // Capturar valor anterior para bitácora
  const { data: anterior } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', id)
    .single();

  const { error } = await supabase
    .from('usuarios')
    .update({ ...cambios })
    .eq('id', id);

  if (error) return { ok: false, error: error.message };

  await escribirBitacora({
    usuario_sistema: user.id,
    accion: 'edicion_usuario',
    tabla_afectada: 'usuarios',
    id_registro: id,
    valor_anterior: anterior ?? null,
    valor_nuevo: cambios as Record<string, unknown>,
  });

  revalidatePath(`/usuarios/${id}`);
  revalidatePath('/usuarios');
  return { ok: true };
}

// ============================================================
// Cambiar estatus (baja/reactivación/suspensión)
// ============================================================
export async function cambiarEstatus(
  id: string,
  nuevoEstatus: EstatusUsuario,
  motivo?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const { data: anterior } = await supabase
    .from('usuarios')
    .select('estatus, nombre, apellido_paterno')
    .eq('id', id)
    .single();

  const actualizacion: Record<string, unknown> = { estatus: nuevoEstatus };
  if (nuevoEstatus === 'baja') {
    actualizacion.fecha_baja = new Date().toISOString().split('T')[0];
    actualizacion.motivo_baja = motivo ?? null;
  } else if (anterior?.estatus === 'baja') {
    // Reactivación: limpiar fecha de baja
    actualizacion.fecha_baja = null;
    actualizacion.motivo_baja = null;
  }

  const { error } = await supabase
    .from('usuarios')
    .update(actualizacion)
    .eq('id', id);

  if (error) return { ok: false, error: error.message };

  // Registrar en tabla bajas si aplica
  if (nuevoEstatus === 'baja') {
    await supabase.from('bajas').insert({
      usuario_id: id,
      fecha_baja: new Date().toISOString().split('T')[0],
      motivo: motivo ?? 'Sin motivo especificado',
      registrado_por: user.id,
    });
  }

  const accion = nuevoEstatus === 'baja'
    ? 'baja_usuario'
    : anterior?.estatus === 'baja'
    ? 'reactivacion_usuario'
    : 'cambio_estatus';

  await escribirBitacora({
    usuario_sistema: user.id,
    accion,
    tabla_afectada: 'usuarios',
    id_registro: id,
    valor_anterior: { estatus: anterior?.estatus },
    valor_nuevo: actualizacion,
    motivo,
  });

  revalidatePath(`/usuarios/${id}`);
  revalidatePath('/usuarios');
  return { ok: true };
}

// ============================================================
// Asignar número de credencial
// ============================================================
export async function asignarCredencial(
  id: string,
  numero_credencial: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  // Verificar unicidad
  const { data: existente } = await supabase
    .from('usuarios')
    .select('id')
    .eq('numero_credencial', numero_credencial.trim())
    .maybeSingle();

  if (existente && existente.id !== id) {
    return { ok: false, error: `El número ${numero_credencial} ya está asignado a otro usuario` };
  }

  const { error } = await supabase
    .from('usuarios')
    .update({ numero_credencial: numero_credencial.trim() })
    .eq('id', id);

  if (error) return { ok: false, error: error.message };

  await escribirBitacora({
    usuario_sistema: user.id,
    accion: 'edicion_usuario',
    tabla_afectada: 'usuarios',
    id_registro: id,
    valor_anterior: null,
    valor_nuevo: { numero_credencial: numero_credencial.trim() },
    motivo: 'Asignación de número de credencial',
  });

  revalidatePath(`/usuarios/${id}`);
  return { ok: true };
}

// ============================================================
// Crear nota en la ficha del usuario
// ============================================================
export async function crearNota(params: {
  usuario_id: string;
  contenido: string;
  modulo?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'No autenticado' };

  const hoy = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('notas')
    .insert({
      usuario_id: params.usuario_id,
      contenido: params.contenido.trim(),
      modulo: params.modulo ?? 'admin',
      tipo_nota: 'operativa',
      creada_por: user.id,
      fecha: hoy,
    })
    .select('id')
    .single();

  if (error) return { ok: false, error: error.message };

  await escribirBitacora({
    usuario_sistema: user.id,
    accion: 'alta_nota',
    tabla_afectada: 'notas',
    id_registro: data.id,
    valor_anterior: null,
    valor_nuevo: { usuario_id: params.usuario_id, contenido: params.contenido },
  });

  revalidatePath(`/usuarios/${params.usuario_id}`);
  return { ok: true };
}
