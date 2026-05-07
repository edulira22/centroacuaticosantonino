'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { registrarIncidente, type DatosIncidente } from '../actions';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { format } from 'date-fns';

interface UsuarioBasico {
  id: string;
  nombre: string;
  apellido_paterno: string;
  numero_credencial: string | null;
}

const INPUT = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition';
const TEXTAREA = `${INPUT} resize-none`;

export function FormularioIncidente() {
  const router = useRouter();
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [exito, setExito]       = useState(false);

  // Búsqueda de usuario
  const [busqueda, setBusqueda]     = useState('');
  const [resultados, setResultados] = useState<UsuarioBasico[]>([]);
  const [usuarioSel, setUsuarioSel] = useState<UsuarioBasico | null>(null);
  const [buscando, setBuscando]     = useState(false);

  // Campos
  const [fecha, setFecha]                 = useState(format(new Date(), 'yyyy-MM-dd'));
  const [descripcion, setDescripcion]     = useState('');
  const [accionTomada, setAccionTomada]   = useState('');
  const [contacto, setContacto]           = useState('');
  const [observaciones, setObservaciones] = useState('');

  const buscarUsuarios = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResultados([]); return; }
    setBuscando(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido_paterno, numero_credencial')
      .or(`nombre.ilike.%${q}%,apellido_paterno.ilike.%${q}%,numero_credencial.ilike.%${q}%`)
      .neq('estatus', 'baja')
      .limit(8);
    setResultados(data ?? []);
    setBuscando(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => buscarUsuarios(busqueda), 300);
    return () => clearTimeout(t);
  }, [busqueda, buscarUsuarios]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!usuarioSel)        { setError('Selecciona un usuario'); return; }
    if (!descripcion.trim()) { setError('La descripción es requerida'); return; }

    setError(null);
    setLoading(true);

    const datos: DatosIncidente = {
      usuario_id: usuarioSel.id,
      fecha,
      descripcion,
      accion_tomada: accionTomada || undefined,
      contacto_avisado: contacto || undefined,
      observaciones: observaciones || undefined,
    };

    const res = await registrarIncidente(datos);
    setLoading(false);

    if (res.ok) {
      setExito(true);
      setTimeout(() => router.push(`/usuarios/${usuarioSel.id}`), 1500);
    } else {
      setError(res.error ?? 'Error inesperado');
    }
  }

  if (exito) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <CheckCircle2 size={48} className="text-vigente mx-auto mb-3" />
        <p className="font-display text-xl font-semibold text-primary">¡Incidente registrado!</p>
        <p className="text-text-muted text-sm mt-1">Redirigiendo a la ficha del usuario...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-vencido/30 text-vencido rounded-xl px-4 py-3 text-sm">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Usuario */}
      <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
        <h2 className="font-display font-semibold text-primary">Usuario involucrado</h2>

        {usuarioSel ? (
          <div className="flex items-center justify-between bg-bg-card rounded-xl px-4 py-3 border border-accent/20">
            <div>
              <p className="font-semibold text-text">{usuarioSel.nombre} {usuarioSel.apellido_paterno}</p>
              {usuarioSel.numero_credencial && (
                <p className="text-xs font-mono text-text-muted">#{usuarioSel.numero_credencial}</p>
              )}
            </div>
            <button type="button"
              onClick={() => { setUsuarioSel(null); setBusqueda(''); }}
              className="text-xs text-vencido hover:underline">
              Cambiar
            </button>
          </div>
        ) : (
          <div className="relative">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o número de credencial..."
                className={`${INPUT} pl-9`}
                autoFocus
              />
            </div>
            {resultados.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
                {resultados.map((u) => (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => { setUsuarioSel(u); setResultados([]); setBusqueda(''); }}
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-bg-card text-left transition-colors"
                    >
                      <span className="text-sm font-medium text-text">{u.nombre} {u.apellido_paterno}</span>
                      {u.numero_credencial && (
                        <span className="text-xs font-mono text-text-muted">#{u.numero_credencial}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {buscando && <p className="text-xs text-text-muted mt-1 px-1">Buscando...</p>}
          </div>
        )}
      </section>

      {/* Datos del incidente */}
      <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h2 className="font-display font-semibold text-primary">Datos del incidente</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Fecha del incidente *">
            <input
              type="date"
              required
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={INPUT}
            />
          </Campo>
        </div>

        <Campo label="Descripción del incidente *">
          <textarea
            required
            rows={4}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Describe qué ocurrió, síntomas observados, circunstancias..."
            className={TEXTAREA}
          />
        </Campo>

        <Campo label="Acción tomada">
          <textarea
            rows={3}
            value={accionTomada}
            onChange={(e) => setAccionTomada(e.target.value)}
            placeholder="Primeros auxilios aplicados, traslado, reposo, etc."
            className={TEXTAREA}
          />
        </Campo>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Contacto avisado">
            <input
              type="text"
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
              placeholder="Nombre y parentesco"
              className={INPUT}
            />
          </Campo>
          <Campo label="Observaciones">
            <input
              type="text"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Notas adicionales"
              className={INPUT}
            />
          </Campo>
        </div>
      </section>

      {/* Botones */}
      <div className="flex gap-3 justify-end">
        <a href="/incidentes"
          className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-bg-card transition-colors">
          Cancelar
        </a>
        <button
          type="submit"
          disabled={loading || !usuarioSel}
          className="px-5 py-2.5 bg-vencido hover:bg-red-600 text-white rounded-lg text-sm font-semibold
                     transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando...' : 'Registrar incidente'}
        </button>
      </div>
    </form>
  );
}

function Campo({ label, children, className }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <label className="block text-sm font-medium text-text">{label}</label>
      {children}
    </div>
  );
}
