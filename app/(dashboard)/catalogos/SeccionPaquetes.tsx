'use client';

import { useState } from 'react';
import { Pencil, Check, X, Plus } from 'lucide-react';
import { actualizarPaquete, crearPaquete } from './actions';

interface Paquete {
  id: string;
  nombre: string;
  codigo: string;
  precio_base: number;
  requiere_autorizacion: boolean;
  activo: boolean;
}

const INPUT = 'px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition';

export function SeccionPaquetes({ paquetes }: { paquetes: Paquete[] }) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<Paquete>>({});
  const [loading, setLoading] = useState(false);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [nuevo, setNuevo] = useState({ nombre: '', codigo: '', precio_base: '', requiere_autorizacion: false });
  const [error, setError] = useState<string | null>(null);

  function iniciarEdicion(p: Paquete) {
    setEditandoId(p.id);
    setEditValues({ nombre: p.nombre, codigo: p.codigo, precio_base: p.precio_base, requiere_autorizacion: p.requiere_autorizacion, activo: p.activo });
    setError(null);
  }

  async function guardar(id: string) {
    setLoading(true);
    const res = await actualizarPaquete(id, {
      nombre: editValues.nombre,
      codigo: editValues.codigo,
      precio_base: Number(editValues.precio_base),
      requiere_autorizacion: editValues.requiere_autorizacion,
      activo: editValues.activo,
    });
    setLoading(false);
    if (res.ok) setEditandoId(null);
    else setError(res.error ?? 'Error al guardar');
  }

  async function toggleActivo(p: Paquete) {
    setLoading(true);
    await actualizarPaquete(p.id, { activo: !p.activo });
    setLoading(false);
  }

  async function agregar() {
    if (!nuevo.nombre.trim()) { setError('El nombre es requerido'); return; }
    if (!nuevo.codigo.trim()) { setError('El código es requerido'); return; }
    setLoading(true);
    const res = await crearPaquete({
      nombre: nuevo.nombre.trim(),
      codigo: nuevo.codigo.trim().toUpperCase(),
      precio_base: Number(nuevo.precio_base) || 0,
      requiere_autorizacion: nuevo.requiere_autorizacion,
    });
    setLoading(false);
    if (res.ok) {
      setMostrarForm(false);
      setNuevo({ nombre: '', codigo: '', precio_base: '', requiere_autorizacion: false });
      setError(null);
    } else setError(res.error ?? 'Error al crear');
  }

  return (
    <section className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-primary">Paquetes</h2>
          <p className="text-xs text-text-muted mt-0.5">Tipos de membresía y tarifas</p>
        </div>
        <button
          onClick={() => { setMostrarForm(true); setError(null); }}
          className="flex items-center gap-1.5 text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-secondary transition-colors"
        >
          <Plus size={13} /> Nuevo paquete
        </button>
      </div>

      {error && (
        <p className="mx-5 mt-3 text-xs text-vencido bg-red-50 border border-vencido/20 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Cabecera tabla */}
      <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_auto_auto] gap-3 px-5 py-2 bg-bg-card/50 border-b border-gray-50 text-xs font-medium text-text-muted">
        <span>Nombre</span>
        <span>Código</span>
        <span>Precio base</span>
        <span>Autorización</span>
        <span>Estado</span>
      </div>

      <div className="divide-y divide-gray-50">
        {paquetes.map((p) => (
          <div key={p.id} className="px-5 py-3">
            {editandoId === p.id ? (
              /* Fila de edición */
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-text-muted">Nombre</label>
                    <input
                      type="text"
                      value={editValues.nombre ?? ''}
                      onChange={(e) => setEditValues((v) => ({ ...v, nombre: e.target.value }))}
                      className={`${INPUT} w-full`}
                      autoFocus
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-text-muted">Código</label>
                    <input
                      type="text"
                      value={editValues.codigo ?? ''}
                      onChange={(e) => setEditValues((v) => ({ ...v, codigo: e.target.value.toUpperCase() }))}
                      className={`${INPUT} w-full`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-text-muted">Precio base ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editValues.precio_base ?? 0}
                      onChange={(e) => setEditValues((v) => ({ ...v, precio_base: parseFloat(e.target.value) || 0 }))}
                      className={`${INPUT} w-full`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-text-muted">Requiere autorización</label>
                    <select
                      value={editValues.requiere_autorizacion ? 'si' : 'no'}
                      onChange={(e) => setEditValues((v) => ({ ...v, requiere_autorizacion: e.target.value === 'si' }))}
                      className={`${INPUT} w-full`}
                    >
                      <option value="no">No</option>
                      <option value="si">Sí</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setEditandoId(null)}
                    className="p-1.5 text-text-muted hover:bg-bg-card rounded-lg transition-colors"
                  >
                    <X size={15} />
                  </button>
                  <button
                    onClick={() => guardar(p.id)}
                    disabled={loading}
                    className="p-1.5 text-vigente hover:bg-green-50 rounded-lg transition-colors disabled:opacity-60"
                  >
                    <Check size={15} />
                  </button>
                </div>
              </div>
            ) : (
              /* Fila de visualización */
              <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto_auto] gap-3 items-center">
                <span className="font-medium text-sm text-text">{p.nombre}</span>
                <span className="font-mono text-xs text-secondary bg-blue-50 px-2 py-0.5 rounded w-fit">{p.codigo}</span>
                <span className="font-semibold text-sm font-mono text-primary">
                  {p.precio_base === 0 ? 'Gratuito' : `$${Number(p.precio_base).toFixed(2)}`}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full w-fit ${p.requiere_autorizacion ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-text-muted'}`}>
                  {p.requiere_autorizacion ? 'Sí' : 'No'}
                </span>
                <div className="flex items-center gap-2">
                  {/* Toggle activo */}
                  <button
                    onClick={() => toggleActivo(p)}
                    disabled={loading}
                    className={`text-xs px-2 py-0.5 rounded-full transition-colors disabled:opacity-60 ${p.activo ? 'bg-green-100 text-vigente hover:bg-green-200' : 'bg-gray-100 text-text-muted hover:bg-gray-200'}`}
                  >
                    {p.activo ? 'Activo' : 'Inactivo'}
                  </button>
                  <button
                    onClick={() => iniciarEdicion(p)}
                    className="p-1.5 text-text-muted hover:text-secondary hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Pencil size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Formulario nuevo paquete */}
      {mostrarForm && (
        <div className="px-5 py-4 border-t border-gray-100 bg-bg-card/40 space-y-3">
          <p className="text-sm font-semibold text-text">Nuevo paquete</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted">Nombre del paquete</label>
              <input
                type="text"
                value={nuevo.nombre}
                onChange={(e) => setNuevo((n) => ({ ...n, nombre: e.target.value }))}
                placeholder="ej: Mensualidad Regular"
                className={`${INPUT} w-full`}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted">Código (mayúsculas)</label>
              <input
                type="text"
                value={nuevo.codigo}
                onChange={(e) => setNuevo((n) => ({ ...n, codigo: e.target.value.toUpperCase() }))}
                placeholder="ej: MEN-REG"
                className={`${INPUT} w-full`}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted">Precio base ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={nuevo.precio_base}
                onChange={(e) => setNuevo((n) => ({ ...n, precio_base: e.target.value }))}
                placeholder="0.00"
                className={`${INPUT} w-full`}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-text-muted">Requiere autorización</label>
              <select
                value={nuevo.requiere_autorizacion ? 'si' : 'no'}
                onChange={(e) => setNuevo((n) => ({ ...n, requiere_autorizacion: e.target.value === 'si' }))}
                className={`${INPUT} w-full`}
              >
                <option value="no">No</option>
                <option value="si">Sí (ej: Becado)</option>
              </select>
            </div>
          </div>
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
