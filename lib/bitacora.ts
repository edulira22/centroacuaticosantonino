import { createClient } from '@/lib/supabase/server';

export type AccionBitacora =
  | 'alta_usuario'
  | 'edicion_usuario'
  | 'baja_usuario'
  | 'reactivacion_usuario'
  | 'cambio_estatus'
  | 'cambio_horario'
  | 'registro_pago'
  | 'anulacion_pago'
  | 'correccion_pago'
  | 'registro_asistencia'
  | 'asistencia_duplicada_autorizada'
  | 'alta_nota'
  | 'registro_incidente'
  | 'login'
  | 'cambio_rol';

interface EscribirBitacoraParams {
  usuario_sistema: string;
  accion: AccionBitacora;
  tabla_afectada: string;
  id_registro: string;
  valor_anterior?: Record<string, unknown> | null;
  valor_nuevo?: Record<string, unknown> | null;
  motivo?: string;
}

/**
 * Registra toda operación crítica en la bitácora de auditoría.
 * Se llama en cada operación de escritura. Nunca interrumpe la operación principal.
 */
export async function escribirBitacora(params: EscribirBitacoraParams): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('bitacora').insert({
      usuario_sistema: params.usuario_sistema,
      accion: params.accion,
      tabla_afectada: params.tabla_afectada,
      id_registro: params.id_registro,
      valor_anterior: params.valor_anterior ?? null,
      valor_nuevo: params.valor_nuevo ?? null,
      motivo: params.motivo ?? null,
      fecha_hora: new Date().toISOString(),
    });

    if (error) {
      console.error('[Bitácora] Error al escribir:', error.message);
    }
  } catch (err) {
    // La bitácora no debe interrumpir la operación principal
    console.error('[Bitácora] Error inesperado:', err);
  }
}
