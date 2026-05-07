'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { crearUsuario, crearUsuarioForzado } from '../actions';
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import type { FormularioAlta } from '@/types/database';

interface Horario  { id: string; nombre: string }
interface Paquete  { id: string; nombre: string; codigo: string | null; precio_base: number; requiere_autorizacion: boolean }

interface Props {
  horarios: Horario[];
  paquetes: Paquete[];
}

const SERVICIOS_MEDICOS = ['IMSS', 'ISSSTE', 'INSABI', 'PCE', 'PEMEX', 'Particular', 'Ninguno', 'Otro'];

type Duplicado = { id: string; nombre: string; apellido_paterno: string; fecha_nacimiento: string | null };

export function FormularioAltaUsuario({ horarios, paquetes }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);
  const [duplicados, setDuplicados] = useState<Duplicado[]>([]);
  const [tipoDuplicado, setTipoDuplicado] = useState<'exacto' | 'posible' | null>(null);
  const [datosParaGuardar, setDatosParaGuardar] = useState<FormularioAlta | null>(null);

  const [form, setForm] = useState<FormularioAlta>({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    fecha_nacimiento: '',
    sexo: '',
    celular: '',
    servicio_medico: '',
    contacto_emergencia_nombre: '',
    contacto_emergencia_celular: '',
    contacto_emergencia_parentesco: '',
    horario_id: '',
    paquete_id: '',
    observaciones: '',
  });

  function set(field: keyof FormularioAlta, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDuplicados([]);
    setLoading(true);

    const res = await crearUsuario(form);
    setLoading(false);

    if (res.ok && res.id) {
      setExito(true);
      setTimeout(() => router.push(`/usuarios/${res.id}`), 1200);
      return;
    }

    if (res.error === 'duplicado' || res.error === 'posible_duplicado') {
      setDuplicados(res.duplicados ?? []);
      setTipoDuplicado(res.error === 'duplicado' ? 'exacto' : 'posible');
      setDatosParaGuardar(form);
      return;
    }

    setError(res.error ?? 'Error inesperado al guardar');
  }

  async function confirmarDuplicado() {
    if (!datosParaGuardar) return;
    setLoading(true);
    const res = await crearUsuarioForzado(datosParaGuardar);
    setLoading(false);
    if (res.ok && res.id) {
      setExito(true);
      setTimeout(() => router.push(`/usuarios/${res.id}`), 1200);
    } else {
      setError(res.error ?? 'Error al guardar');
      setDuplicados([]);
    }
  }

  if (exito) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <CheckCircle2 size={48} className="text-vigente mx-auto mb-3" />
        <p className="font-display text-xl font-semibold text-primary">¡Usuario registrado!</p>
        <p className="text-text-muted text-sm mt-1">Redirigiendo a la ficha...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Error general */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-vencido/30 text-vencido rounded-xl px-4 py-3 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Advertencia de duplicado */}
      {duplicados.length > 0 && (
        <div className="bg-amber-50 border border-prorroga/30 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2 text-prorroga">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">
                {tipoDuplicado === 'exacto'
                  ? 'Posible registro duplicado exacto'
                  : 'Usuarios con nombre similar encontrados'}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {tipoDuplicado === 'exacto'
                  ? 'Se encontró un usuario activo con el mismo nombre y fecha de nacimiento.'
                  : 'Se encontraron usuarios con nombre similar. Verifica antes de continuar.'}
              </p>
            </div>
          </div>
          <ul className="space-y-1">
            {duplicados.map((d) => (
              <li key={d.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-sm border border-amber-100">
                <span className="font-medium text-text">
                  {d.nombre} {d.apellido_paterno}
                  {d.fecha_nacimiento && <span className="text-text-muted ml-2 text-xs">({d.fecha_nacimiento})</span>}
                </span>
                <a href={`/usuarios/${d.id}`} target="_blank" rel="noopener noreferrer"
                  className="text-secondary hover:underline text-xs flex items-center gap-1">
                  Ver ficha <ChevronRight size={12} />
                </a>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDuplicados([])}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm hover:bg-white transition-colors"
            >
              Cancelar — revisar datos
            </button>
            <button
              type="button"
              onClick={confirmarDuplicado}
              disabled={loading}
              className="flex-1 py-2 bg-prorroga text-white rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors disabled:opacity-60"
            >
              {loading ? 'Guardando...' : 'Confirmar — es un usuario diferente'}
            </button>
          </div>
        </div>
      )}

      {/* Sección 1: Datos personales */}
      <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h2 className="font-display font-semibold text-primary">Datos personales</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Nombre(s) *" required>
            <input type="text" required value={form.nombre} onChange={(e) => set('nombre', e.target.value)}
              className={INPUT} placeholder="Ej: María del Carmen" />
          </Campo>
          <Campo label="Apellido paterno *" required>
            <input type="text" required value={form.apellido_paterno} onChange={(e) => set('apellido_paterno', e.target.value)}
              className={INPUT} placeholder="Ej: González" />
          </Campo>
          <Campo label="Apellido materno">
            <input type="text" value={form.apellido_materno} onChange={(e) => set('apellido_materno', e.target.value)}
              className={INPUT} placeholder="Opcional" />
          </Campo>
          <Campo label="Fecha de nacimiento">
            <input type="date" value={form.fecha_nacimiento} onChange={(e) => set('fecha_nacimiento', e.target.value)}
              className={INPUT} />
          </Campo>
          <Campo label="Sexo">
            <select value={form.sexo} onChange={(e) => set('sexo', e.target.value)} className={INPUT}>
              <option value="">— Seleccionar —</option>
              <option value="MASCULINO">Masculino</option>
              <option value="FEMENINO">Femenino</option>
              <option value="OTRO">Otro</option>
            </select>
          </Campo>
          <Campo label="Celular">
            <input type="tel" value={form.celular} onChange={(e) => set('celular', e.target.value)}
              className={INPUT} placeholder="614 123 4567" />
          </Campo>
          <Campo label="Servicio médico" className="sm:col-span-2">
            <select value={form.servicio_medico} onChange={(e) => set('servicio_medico', e.target.value)} className={INPUT}>
              <option value="">— Seleccionar —</option>
              {SERVICIOS_MEDICOS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Campo>
        </div>
      </section>

      {/* Sección 2: Contacto de emergencia */}
      <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h2 className="font-display font-semibold text-primary">Contacto de emergencia</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Campo label="Nombre">
            <input type="text" value={form.contacto_emergencia_nombre}
              onChange={(e) => set('contacto_emergencia_nombre', e.target.value)}
              className={INPUT} placeholder="Nombre completo" />
          </Campo>
          <Campo label="Teléfono">
            <input type="tel" value={form.contacto_emergencia_celular}
              onChange={(e) => set('contacto_emergencia_celular', e.target.value)}
              className={INPUT} placeholder="614 123 4567" />
          </Campo>
          <Campo label="Parentesco">
            <select value={form.contacto_emergencia_parentesco}
              onChange={(e) => set('contacto_emergencia_parentesco', e.target.value)} className={INPUT}>
              <option value="">— Parentesco —</option>
              {['Madre', 'Padre', 'Cónyuge', 'Hijo/a', 'Hermano/a', 'Tutor/a', 'Otro'].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </Campo>
        </div>
      </section>

      {/* Sección 3: Inscripción */}
      <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h2 className="font-display font-semibold text-primary">Datos de inscripción</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Horario">
            <select value={form.horario_id} onChange={(e) => set('horario_id', e.target.value)} className={INPUT}>
              <option value="">— Sin horario —</option>
              {horarios.map((h) => <option key={h.id} value={h.id}>{h.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Paquete / Tarifa">
            <select value={form.paquete_id} onChange={(e) => set('paquete_id', e.target.value)} className={INPUT}>
              <option value="">— Sin paquete —</option>
              {paquetes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}{p.codigo ? ` (${p.codigo})` : ''}
                  {p.requiere_autorizacion ? ' ⭐' : ''}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Observaciones" className="sm:col-span-2">
            <textarea
              value={form.observaciones}
              onChange={(e) => set('observaciones', e.target.value)}
              rows={3}
              className={`${INPUT} resize-none`}
              placeholder="Notas adicionales sobre el usuario (condición médica, convenio, etc.)"
            />
          </Campo>
        </div>
      </section>

      {/* Botones */}
      <div className="flex gap-3 justify-end">
        <a href="/usuarios"
          className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-bg-card transition-colors">
          Cancelar
        </a>
        <button
          type="submit"
          disabled={loading || duplicados.length > 0}
          className="px-5 py-2.5 bg-primary hover:bg-secondary text-white rounded-lg text-sm font-semibold
                     transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando...' : 'Registrar usuario'}
        </button>
      </div>
    </form>
  );
}

// Componentes de ayuda locales
const INPUT = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition';

function Campo({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <label className="block text-sm font-medium text-text">
        {label}
        {required && <span className="text-vencido ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
