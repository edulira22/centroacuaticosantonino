'use server';

import { calcularEstatus } from '@/lib/vigencia';
import type { EstatusUsuario } from '@/types/database';

export interface VigenciaCliente {
  estatus: EstatusUsuario;
  vigente_hasta: string | null;
  dias_vencido: number;
  ultimo_pago: {
    fecha: string;
    monto: number;
    numero_recibo: string | null;
  } | null;
}

export async function calcularEstatusCliente(usuario_id: string): Promise<VigenciaCliente> {
  const resultado = await calcularEstatus(usuario_id);
  return {
    estatus: resultado.estatus,
    vigente_hasta: resultado.vigente_hasta,
    dias_vencido: resultado.dias_vencido,
    ultimo_pago: resultado.ultimo_pago,
  };
}
