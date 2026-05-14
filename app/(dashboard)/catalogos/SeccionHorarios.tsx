'use client';

import { useState } from 'react';
import { Pencil, Check, X, Plus, Clock } from 'lucide-react';
import { actualizarHorario, crearHorario } from './actions';

interface Horario {
  id: string;
  nombre: string;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
}

const INPUT = 'px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition';

export function SeccionHorarios({ horarios }: { horarios: Horario[] }) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Horario>>({});
  const [loading, setLoading] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nuevo, setNuevo] = useState({ hora_inicio: '', hora_fin: '' });
  const [error, setError] = useState<string | null>(null);

  function iniciarEdicion(h: Horario) {
    setEditandoId(h.id);
    setEditValues({ nombre: h.nombre, hora_inicio: h.hora_inicio, hora_fin: h.hora_fin, activo: h.activo });
    setError(null);
  }

  async function guardar(id: string) {
    setLoading(true);
    const res = await actualizarHorario(id, {
      nombre: editValues.nombre,
      hora_inicio: editValues.hora_inicio,
      hora_fin: editValues.hora_fin,
      activo: editValues.activo,
    });
    setLoading(false);
    if (res.ok) setEditandoId(null);
    else setError(res.error ?? 'Error al guardar');
  }

  async function toggleActivo(h: Horario) {
    setLoading(true);
    await actualizarHorario(h.id, { activo: !h.activo });
    setLoading(false);
  }

  async function agregar() {
    if (!nuevo.hora_inicio || !nuevo.hora_fin) { setError('Hora de inicio y fin son requeridas'); return; }
    if (nuevo.hora_inicio >= nuevo.hora_fin) { setError('La hora de fin debe ser mayor a la de inicio'); return; }
    setLoading(true);
    const res = await crearHorario({ hora_inicio: nuevo.hora_inicio, hora_fin: nuevo.hora_fin });
    setLoading(false);
    if (res.ok) {
      setMostrarForm(false);
      setNuevo({ hora_inicio: '', hora_fin: '' });
      setError(null);
    } else setError(res.error ?? 'Error al crear');
  }

  function fmt(t: string) {
    // "08:00:00" → "8:00 AM"
    const [h, m] = t.split(':').map(Number);
    const ampm = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  }

  return (
    <section className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-primary">Horarios</h2>
          <p className="text-xs text-text-muted mt-0.5">Turnos disponibles en el centro</p>
        </div>
        <button
          onClick={() => { setMostrarForm(true); setError(null); }}
          className="flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-secondary transition-colors"
        >
          <Plus size={13} /> Nuevo horario
        </button>
      </div>

      {error && (
        <p className="mx-5 mt-3 text-xs text-vencido bg-red-50 border border-vencido/20 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="divide-y divide-gray-50">
        {horarios.map((h) => (
          <div key={h.id} className="px-5 py-3">
            {editandoId === h.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div className="space-y-1">
                    <label className="text-xs text-text-muted">Nombre / Etiqueta</label>
                    <input
                      type="text"
                      value={editValues.nombre ?? ''}
                      onChange={(e) => setEditValues((v) => ({ ...v, nombre: e.target.value }))}
                      className={`${INPUT} w-full`}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-text-muted">Hora inicio</label>
                    <input
                      type="time"
                      value={editValues.hora_inicio?.substring(0, 5) ?? ''}
                      onChange={(e) => setEditValues((v) => ({ ...v, hora_inicio: e.target.value + ':00' }))}
                      className={`${INPUT} w-full`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-text-muted">Hora fin</label>
                    <input
                      type="time"
                      value={editValues.hora_fin?.substring(0, 5) ?? ''}
                      onChange={(e) => setEditValues((v) => ({ ...v, hora_fin: e.target.value + ':00' }))}
                      className={`${INPUT} w-full`}
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditandoId(null)} className="p-1.5 text-text-muted hover:bg-bg-card rounded-lg transition-colors">
                    <X size={15} />
                  </button>
                  <button onClick={() => guardar(h.id)} disabled={loading} className="p-1.5 text-vigente hover:bg-green-50 rounded-lg transition-colors disabled:opacity-60">
                    <Check size={15} />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Clock size={16} className="text-secondary shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm text-text">{h.nombre}</span>
                  <span className="text-xs text-text-muted ml-2">
                    {fmt(h.hora_inicio)} – {fmt(h.hora_fin)}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleActivo(h)}
                    disabled={loading}
                    className={`text-xs px-2 py-0.5 rounded-full transition-colors disabled:opacity-60 ${h.activo ? 'bg-green-100 text-vigente hover:bg-green-200' : 'bg-gray-100 text-text-muted hover:bg-gray-200'}`}
                  >
                    {h.activo ? 'Activo' : 'Inactivo'}
                  </button>
                  <button
                    onClick={() => iniciarEdicion(h)}
                    className="p-1.5 text-text-muted hover:text-secondary hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {horarios.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-text-muted">No hay horarios registrados</p>
        )}
      </div>

      {/* Formulario nuevo horario */}
      {mostrarForm && (
        <div className="px-5 py-4 border-t border-gray-100 bg-bg-card/40 space-y-3">
          <p className="text-sm font-semibold text-text">Nuevo horario</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted">Hora de inicio</label>
              <input
                type="time"
                value={nuevo.hora_inicio}
                onChange={(e) => setNuevo((n) => ({ ...n, hora_inicio: e.target.value }))}
                className={`${INPUT} w-full`}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted">Hora de fin</label>
              <input
                type="time"
                value={nuevo.hora_fin}
                onChange={(e) => setNuevo((n) => ({ ...n, hora_fin: e.target.value }))}
                className={`${INPUT} w-full`}
              />
            </div>
          </div>
          <p className="text-xs text-text-muted">El nombre se genera automáticamente (ej: 08:00-10:00)</p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setMostrarForm(false); setError(null); }}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={agregar}
              disabled={loading}
              className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-secondary transition-colors disabled:opacity-60"
            >
              {loading ? 'Guardando...' : 'Agregar'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
