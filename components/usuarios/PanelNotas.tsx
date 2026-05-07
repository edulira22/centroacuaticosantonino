'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearNota } from '@/app/(dashboard)/usuarios/actions';
import { FileText, Plus, Send } from 'lucide-react';

interface Nota {
  id: string;
  contenido: string;
  modulo: string | null;
  fecha: string;
}

export function PanelNotas({
  usuarioId,
  notas,
}: {
  usuarioId: string;
  notas: Nota[];
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [contenido, setContenido] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contenido.trim()) return;
    setLoading(true);
    setError(null);
    const res = await crearNota({
      usuario_id: usuarioId,
      contenido: contenido.trim(),
      modulo: 'admin',
    });
    setLoading(false);
    if (res.ok) {
      setContenido('');
      setAbierto(false);
      router.refresh();
    } else {
      setError(res.error ?? 'Error inesperado');
    }
  }

  return (
    <section className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
        <h2 className="font-display font-semibold text-sm text-text flex items-center gap-2">
          <FileText size={14} className="text-secondary" />
          Notas
        </h2>
        <button
          onClick={() => { setAbierto(!abierto); setError(null); }}
          className="flex items-center gap-1 text-xs text-secondary hover:underline"
        >
          <Plus size={12} />
          Agregar
        </button>
      </div>

      {abierto && (
        <form onSubmit={handleSubmit} className="px-4 py-3 border-b border-gray-50 bg-bg-card/40 space-y-2">
          <textarea
            value={contenido}
            onChange={(e) => setContenido(e.target.value)}
            rows={3}
            placeholder="Escribe una nota sobre este usuario..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary
                       resize-none transition"
            autoFocus
          />
          {error && <p className="text-xs text-vencido">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setAbierto(false); setContenido(''); setError(null); }}
              className="text-xs text-text-muted hover:underline"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !contenido.trim()}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary hover:bg-secondary text-white
                         rounded-lg text-xs font-medium transition-colors disabled:opacity-60"
            >
              <Send size={12} />
              {loading ? 'Guardando...' : 'Guardar nota'}
            </button>
          </div>
        </form>
      )}

      {notas.length > 0 ? (
        <ul className="divide-y divide-gray-50">
          {notas.map((n) => (
            <li key={n.id} className="px-4 py-3">
              <p className="text-sm text-text whitespace-pre-wrap">{n.contenido}</p>
              <p className="text-xs text-text-muted mt-1">
                {n.modulo && <span className="capitalize">{n.modulo} · </span>}
                {n.fecha}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-4 py-6 text-center text-text-muted text-xs">Sin notas registradas</p>
      )}
    </section>
  );
}
