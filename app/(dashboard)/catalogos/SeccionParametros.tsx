'use client';

import { useState } from 'react';
import { Pencil, Check, X, Trash2, Lock } from 'lucide-react';
import { actualizarParametro, eliminarParametro } from './actions';

interface Parametro {
  id: string;
  clave: string;
  valor: string;
  tipo: 'numero' | 'texto';
  descripcion: string | null;
  es_sistema: boolean;
}

const INPUT = 'px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition';

export function SeccionParametros({ parametros }: { parametros: Parametro[] }) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [valorEdit, setValorEdit] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guardar(id: string) {
    setLoading(true);
    const res = await actualizarParametro(id, valorEdit);
    setLoading(false);
    if (res.ok) setEditandoId(null);
    else setError(res.error ?? 'Error');
  }

  async function borrar(id: string) {
    if (!confirm('¿Eliminar este parámetro?')) return;
    setLoading(true);
    await eliminarParametro(id);
    setLoading(false);
  }

  return (
    <section className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-primary">Parámetros del sistema</h2>
          <p className="text-xs text-text-muted mt-0.5">Multa, días de gracia y configuración general</p>
        </div>
      </div>

      {error && (
        <p className="mx-5 mt-3 text-xs text-vencido bg-red-50 border border-vencido/20 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="divide-y divide-gray-50">
        {parametros.map((p) => (
          <div key={p.id} className="px-5 py-4 flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-secondary bg-blue-50 px-2 py-0.5 rounded">{p.clave}</span>
                {p.es_sistema && <Lock size={11} className="text-text-muted" />}
                <span className="text-xs text-text-muted">{p.tipo === 'numero' ? 'Número' : 'Texto'}</span>
              </div>
              {p.descripcion && <p className="text-xs text-text-muted mt-1">{p.descripcion}</p>}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {editandoId === p.id ? (
                <>
                  <input
                    type={p.tipo === 'numero' ? 'number' : 'text'}
                    value={valorEdit}
                    onChange={(e) => setValorEdit(e.target.value)}
                    className={`${INPUT} w-40`}
                    autoFocus
                  />
                  <button onClick={() => guardar(p.id)} disabled={loading}
                    className="p-1.5 text-vigente hover:bg-green-50 rounded-lg transition-colors disabled:opacity-60">
                    <Check size={15} />
                  </button>
                  <button onClick={() => setEditandoId(null)}
                    className="p-1.5 text-text-muted hover:bg-bg-card rounded-lg transition-colors">
                    <X size={15} />
                  </button>
                </>
              ) : (
                <>
                  <span className={`font-semibold text-sm ${p.tipo === 'numero' ? 'font-mono text-primary' : 'text-text'}`}>
                    {p.tipo === 'numero' && p.clave.includes('multa') ? `$${Number(p.valor).toFixed(2)}` : p.valor}
                  </span>
                  <button onClick={() => { setEditandoId(p.id); setValorEdit(p.valor); setError(null); }}
                    className="p-1.5 text-text-muted hover:text-secondary hover:bg-blue-50 rounded-lg transition-colors">
                    <Pencil size={14} />
                  </button>
                  {!p.es_sistema && (
                    <button onClick={() => borrar(p.id)} disabled={loading}
                      className="p-1.5 text-text-muted hover:text-vencido hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

    </section>
  );
}
