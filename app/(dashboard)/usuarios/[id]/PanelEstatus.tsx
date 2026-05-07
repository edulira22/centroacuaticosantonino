'use client';

import { useState } from 'react';
import { cambiarEstatus } from '../actions';
import { BadgeEstatus } from '@/components/usuarios/BadgeEstatus';
import type { EstatusUsuario } from '@/types/database';
import { AlertTriangle, RotateCcw, Pause } from 'lucide-react';

interface Props {
  usuario: { id: string; estatus: EstatusUsuario; nombre: string; apellido_paterno: string };
}

export function PanelEstatus({ usuario }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<EstatusUsuario | null>(null);
  const [motivo, setMotivo] = useState('');

  const estatus = usuario.estatus;
  const estaActivo = estatus !== 'baja' && estatus !== 'suspendido';

  async function ejecutarCambio() {
    if (!confirmando) return;
    setLoading(true);
    setError(null);
    const res = await cambiarEstatus(usuario.id, confirmando, motivo);
    setLoading(false);
    if (res.ok) {
      setConfirmando(null);
      setMotivo('');
    } else {
      setError(res.error ?? 'Error al cambiar estatus');
    }
  }

  return (
    <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
      <h2 className="font-display font-semibold text-text">Estatus</h2>

      <div className="flex items-center gap-3">
        <BadgeEstatus estatus={estatus} />
        <span className="text-sm text-text-muted capitalize">
          {usuario.nombre} {usuario.apellido_paterno}
        </span>
      </div>

      {error && (
        <p className="text-xs text-vencido bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Panel de confirmación */}
      {confirmando && (
        <div className="bg-amber-50 border border-prorroga/20 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-amber-800">
            {confirmando === 'baja' && '¿Dar de baja a este usuario?'}
            {confirmando === 'suspendido' && '¿Suspender este usuario?'}
            {confirmando === 'activo' && '¿Reactivar este usuario?'}
          </p>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={2}
            placeholder="Motivo (opcional)"
            className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm resize-none focus:outline-none focus:border-prorroga"
          />
          <div className="flex gap-2">
            <button onClick={() => { setConfirmando(null); setMotivo(''); }}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-xs hover:bg-white transition-colors">
              Cancelar
            </button>
            <button onClick={ejecutarCambio} disabled={loading}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-60 ${
                confirmando === 'baja' ? 'bg-vencido hover:bg-red-600'
                : confirmando === 'suspendido' ? 'bg-text-muted hover:bg-gray-500'
                : 'bg-vigente hover:bg-green-600'
              }`}>
              {loading ? 'Guardando...' : 'Confirmar'}
            </button>
          </div>
        </div>
      )}

      {/* Botones de acción */}
      {!confirmando && (
        <div className="space-y-2">
          {estatus === 'baja' || estatus === 'suspendido' ? (
            <button
              onClick={() => setConfirmando('activo')}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-vigente/10 text-vigente border border-vigente/20 rounded-lg text-sm font-medium hover:bg-vigente/20 transition-colors"
            >
              <RotateCcw size={14} /> Reactivar usuario
            </button>
          ) : (
            <>
              <button
                onClick={() => setConfirmando('suspendido')}
                className="w-full flex items-center justify-center gap-2 py-2 border border-gray-200 text-text-muted rounded-lg text-sm hover:bg-bg-card transition-colors"
              >
                <Pause size={14} /> Suspender temporalmente
              </button>
              {estaActivo && (
                <button
                  onClick={() => setConfirmando('baja')}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-red-50 text-vencido border border-vencido/20 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  <AlertTriangle size={14} /> Dar de baja
                </button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
