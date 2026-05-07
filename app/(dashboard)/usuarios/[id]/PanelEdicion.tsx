'use client';

import { useState } from 'react';
import { editarUsuario, asignarCredencial } from '../actions';
import { Pencil, Check, X } from 'lucide-react';

interface Horario { id: string; nombre: string }
interface Paquete { id: string; nombre: string; codigo: string | null; precio_base: number; requiere_autorizacion: boolean }

interface UsuarioBase {
  id: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string | null;
  fecha_nacimiento: string | null;
  sexo: string | null;
  celular: string | null;
  servicio_medico: string | null;
  contacto_emergencia_nombre: string | null;
  contacto_emergencia_celular: string | null;
  contacto_emergencia_parentesco: string | null;
  horario_id: string | null;
  paquete_id: string | null;
  numero_credencial: string | null;
  observaciones: string | null;
}

interface Props {
  usuario: UsuarioBase;
  horarios: Horario[];
  paquetes: Paquete[];
}

const INPUT = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition';

export function PanelEdicion({ usuario, horarios, paquetes }: Props) {
  const [editando, setEditando] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credencial, setCredencial] = useState(usuario.numero_credencial ?? '');
  const [editandoCredencial, setEditandoCredencial] = useState(false);

  const [form, setForm] = useState({
    nombre: usuario.nombre,
    apellido_paterno: usuario.apellido_paterno,
    apellido_materno: usuario.apellido_materno ?? '',
    fecha_nacimiento: usuario.fecha_nacimiento ?? '',
    sexo: usuario.sexo ?? '',
    celular: usuario.celular ?? '',
    servicio_medico: usuario.servicio_medico ?? '',
    contacto_emergencia_nombre: usuario.contacto_emergencia_nombre ?? '',
    contacto_emergencia_celular: usuario.contacto_emergencia_celular ?? '',
    contacto_emergencia_parentesco: usuario.contacto_emergencia_parentesco ?? '',
    horario_id: usuario.horario_id ?? '',
    paquete_id: usuario.paquete_id ?? '',
    observaciones: usuario.observaciones ?? '',
  });

  async function guardar() {
    setLoading(true);
    setError(null);
    const res = await editarUsuario(usuario.id, {
      ...form,
      apellido_materno: form.apellido_materno || undefined,
      fecha_nacimiento: form.fecha_nacimiento || undefined,
      horario_id: form.horario_id || undefined,
      paquete_id: form.paquete_id || undefined,
    });
    setLoading(false);
    if (res.ok) {
      setEditando(false);
    } else {
      setError(res.error ?? 'Error al guardar');
    }
  }

  async function guardarCredencial() {
    setLoading(true);
    const res = await asignarCredencial(usuario.id, credencial);
    setLoading(false);
    if (res.ok) {
      setEditandoCredencial(false);
    } else {
      setError(res.error ?? 'Error');
    }
  }

  return (
    <section className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
        <h2 className="font-display font-semibold text-text">Datos del usuario</h2>
        {!editando ? (
          <button
            onClick={() => setEditando(true)}
            className="flex items-center gap-1.5 text-xs text-secondary hover:text-primary transition-colors"
          >
            <Pencil size={13} /> Editar
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => { setEditando(false); setError(null); }}
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text transition-colors"
            >
              <X size={13} /> Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={loading}
              className="flex items-center gap-1 text-xs text-vigente hover:text-green-700 font-semibold transition-colors disabled:opacity-60"
            >
              <Check size={13} /> {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        {error && (
          <p className="text-xs text-vencido bg-red-50 border border-vencido/20 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* ID Credencial */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">ID Credencial</p>
          {editandoCredencial ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={credencial}
                onChange={(e) => setCredencial(e.target.value)}
                className={INPUT}
                placeholder="Ej: 001"
              />
              <button onClick={guardarCredencial} disabled={loading}
                className="px-3 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-secondary disabled:opacity-60 transition-colors">
                {loading ? '...' : 'OK'}
              </button>
              <button onClick={() => setEditandoCredencial(false)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-xs hover:bg-bg-card transition-colors">
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className={`font-mono text-sm ${credencial ? 'text-secondary' : 'text-text-muted italic'}`}>
                {credencial || 'Sin asignar'}
              </span>
              <button onClick={() => setEditandoCredencial(true)}
                className="text-text-muted hover:text-secondary transition-colors">
                <Pencil size={12} />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Campo label="Nombre(s)">
            {editando
              ? <input type="text" value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} className={INPUT} />
              : <Valor>{usuario.nombre}</Valor>}
          </Campo>
          <Campo label="Apellido paterno">
            {editando
              ? <input type="text" value={form.apellido_paterno} onChange={(e) => setForm((f) => ({ ...f, apellido_paterno: e.target.value }))} className={INPUT} />
              : <Valor>{usuario.apellido_paterno}</Valor>}
          </Campo>
          <Campo label="Apellido materno">
            {editando
              ? <input type="text" value={form.apellido_materno} onChange={(e) => setForm((f) => ({ ...f, apellido_materno: e.target.value }))} className={INPUT} />
              : <Valor>{usuario.apellido_materno ?? '—'}</Valor>}
          </Campo>
          <Campo label="Fecha de nacimiento">
            {editando
              ? <input type="date" value={form.fecha_nacimiento} onChange={(e) => setForm((f) => ({ ...f, fecha_nacimiento: e.target.value }))} className={INPUT} />
              : <Valor>{usuario.fecha_nacimiento ?? '—'}</Valor>}
          </Campo>
          <Campo label="Sexo">
            {editando
              ? (
                <select value={form.sexo} onChange={(e) => setForm((f) => ({ ...f, sexo: e.target.value }))} className={INPUT}>
                  <option value="">—</option>
                  <option value="MASCULINO">Masculino</option>
                  <option value="FEMENINO">Femenino</option>
                  <option value="OTRO">Otro</option>
                </select>
              )
              : <Valor>{usuario.sexo ?? '—'}</Valor>}
          </Campo>
          <Campo label="Celular">
            {editando
              ? <input type="tel" value={form.celular} onChange={(e) => setForm((f) => ({ ...f, celular: e.target.value }))} className={INPUT} />
              : <Valor>{usuario.celular ?? '—'}</Valor>}
          </Campo>
          <Campo label="Horario">
            {editando
              ? (
                <select value={form.horario_id} onChange={(e) => setForm((f) => ({ ...f, horario_id: e.target.value }))} className={INPUT}>
                  <option value="">— Sin horario —</option>
                  {horarios.map((h) => <option key={h.id} value={h.id}>{h.nombre}</option>)}
                </select>
              )
              : <Valor>{horarios.find((h) => h.id === usuario.horario_id)?.nombre ?? '—'}</Valor>}
          </Campo>
          <Campo label="Paquete">
            {editando
              ? (
                <select value={form.paquete_id} onChange={(e) => setForm((f) => ({ ...f, paquete_id: e.target.value }))} className={INPUT}>
                  <option value="">— Sin paquete —</option>
                  {paquetes.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              )
              : <Valor>{paquetes.find((p) => p.id === usuario.paquete_id)?.nombre ?? '—'}</Valor>}
          </Campo>
        </div>

        {editando && (
          <Campo label="Observaciones" className="sm:col-span-2">
            <textarea
              value={form.observaciones}
              onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))}
              rows={3}
              className={`${INPUT} resize-none`}
            />
          </Campo>
        )}
      </div>
    </section>
  );
}

function Campo({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-1 ${className ?? ''}`}>
      <p className="text-xs font-medium text-text-muted">{label}</p>
      {children}
    </div>
  );
}

function Valor({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-text">{children}</p>;
}
