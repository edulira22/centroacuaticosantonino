'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { registrarPago, type DatosRegistroPago } from '../actions';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, AlertCircle, Search } from 'lucide-react';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Paquete  { id: string; nombre: string; codigo: string | null; precio_base: number; requiere_autorizacion: boolean }
interface Metodo   { id: string; nombre: string }
interface UsuarioBasico { id: string; nombre: string; apellido_paterno: string; numero_credencial: string | null; paquete_id: string | null }

interface Props {
  paquetes: Paquete[];
  metodos: Metodo[];
  usuarioPrellenado: UsuarioBasico | null;
}

const INPUT = 'w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition';

function mesActualISO() {
  return format(startOfMonth(new Date()), 'yyyy-MM');
}

export function FormularioPago({ paquetes, metodos, usuarioPrellenado }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  // Búsqueda de usuario
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<UsuarioBasico[]>([]);
  const [usuarioSel, setUsuarioSel] = useState<UsuarioBasico | null>(usuarioPrellenado);
  const [buscando, setBuscando] = useState(false);

  // Campos del pago
  const [mesSeleccionado, setMesSeleccionado] = useState(mesActualISO());
  const [paqueteId, setPaqueteId] = useState(usuarioPrellenado?.paquete_id ?? '');
  const [monto, setMonto] = useState('');
  const [fechaPago, setFechaPago] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [recibo, setRecibo] = useState('');
  const [metodoPagoId, setMetodoPagoId] = useState('');
  const [observaciones, setObservaciones] = useState('');

  // Auto-rellenar monto cuando cambia el paquete
  useEffect(() => {
    const paq = paquetes.find((p) => p.id === paqueteId);
    if (paq) setMonto(String(paq.precio_base));
  }, [paqueteId, paquetes]);

  // Usar paquete del usuario seleccionado
  useEffect(() => {
    if (usuarioSel?.paquete_id) setPaqueteId(usuarioSel.paquete_id);
  }, [usuarioSel]);

  // Buscar usuarios en Supabase
  const buscarUsuarios = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResultados([]); return; }
    setBuscando(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('usuarios')
      .select('id, nombre, apellido_paterno, numero_credencial, paquete_id')
      .or(`nombre.ilike.%${q}%,apellido_paterno.ilike.%${q}%,numero_credencial.ilike.%${q}%`)
      .neq('estatus', 'baja')
      .limit(8);
    setResultados(data ?? []);
    setBuscando(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => buscarUsuarios(busqueda), 300);
    return () => clearTimeout(timer);
  }, [busqueda, buscarUsuarios]);

  // Calcular período a partir del mes seleccionado
  function calcularFechas() {
    const fecha = parseISO(`${mesSeleccionado}-01`);
    return {
      periodo_mes: format(startOfMonth(fecha), 'yyyy-MM-dd'),
      fecha_inicio: format(startOfMonth(fecha), 'yyyy-MM-dd'),
      fecha_fin: format(endOfMonth(fecha), 'yyyy-MM-dd'),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!usuarioSel) { setError('Selecciona un usuario'); return; }
    if (!paqueteId)  { setError('Selecciona un paquete'); return; }
    if (!monto || Number(monto) < 0) { setError('Ingresa un monto válido'); return; }

    setError(null);
    setLoading(true);

    const { periodo_mes, fecha_inicio, fecha_fin } = calcularFechas();

    const datos: DatosRegistroPago = {
      usuario_id: usuarioSel.id,
      fecha_pago: fechaPago,
      monto: Number(monto),
      paquete_id: paqueteId,
      periodo_mes,
      fecha_inicio,
      fecha_fin,
      numero_recibo: recibo,
      metodo_pago_id: metodoPagoId,
      observaciones,
    };

    const res = await registrarPago(datos);
    setLoading(false);

    if (res.ok) {
      setExito(true);
      setTimeout(() => router.push(`/usuarios/${usuarioSel.id}`), 1500);
    } else {
      setError(res.error ?? 'Error inesperado');
    }
  }

  // Meses disponibles para el selector (mes actual ± 6)
  const hoy = new Date();
  const meses: string[] = [];
  for (let i = -3; i <= 6; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
    meses.push(format(d, 'yyyy-MM'));
  }

  const { fecha_fin: fechaFin } = calcularFechas();

  if (exito) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <CheckCircle2 size={48} className="text-vigente mx-auto mb-3" />
        <p className="font-display text-xl font-semibold text-primary">¡Pago registrado!</p>
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

      {/* Sección 1: Selección de usuario */}
      <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h2 className="font-display font-semibold text-primary">Usuario</h2>

        {usuarioSel ? (
          <div className="flex items-center justify-between bg-bg-card rounded-xl px-4 py-3 border border-accent/20">
            <div>
              <p className="font-semibold text-text">{usuarioSel.nombre} {usuarioSel.apellido_paterno}</p>
              {usuarioSel.numero_credencial && (
                <p className="text-xs font-mono text-text-muted">#{usuarioSel.numero_credencial}</p>
              )}
            </div>
            <button type="button" onClick={() => { setUsuarioSel(null); setBusqueda(''); }}
              className="text-xs text-vencido hover:underline">Cambiar</button>
          </div>
        ) : (
          <div className="relative">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o ID Credencial..."
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
            {buscando && (
              <p className="text-xs text-text-muted mt-1 px-1">Buscando...</p>
            )}
          </div>
        )}
      </section>

      {/* Sección 2: Período y paquete */}
      <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h2 className="font-display font-semibold text-primary">Período y paquete</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Mes que cubre *">
            <select value={mesSeleccionado} onChange={(e) => setMesSeleccionado(e.target.value)} className={INPUT}>
              {meses.map((m) => (
                <option key={m} value={m}>
                  {format(parseISO(`${m}-01`), 'MMMM yyyy', { locale: es })}
                </option>
              ))}
            </select>
          </Campo>
          <Campo label="Vigente hasta">
            <div className={`${INPUT} bg-bg-card text-text-muted cursor-default`}>
              {fechaFin}
            </div>
          </Campo>
          <Campo label="Paquete / Tarifa *" className="sm:col-span-2">
            <select value={paqueteId} onChange={(e) => setPaqueteId(e.target.value)} className={INPUT} required>
              <option value="">— Seleccionar paquete —</option>
              {paquetes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}{p.codigo ? ` (${p.codigo})` : ''} — ${p.precio_base.toFixed(2)}
                  {p.requiere_autorizacion ? ' ⭐' : ''}
                </option>
              ))}
            </select>
          </Campo>
        </div>
      </section>

      {/* Sección 3: Datos del pago */}
      <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
        <h2 className="font-display font-semibold text-primary">Datos del pago</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Campo label="Monto cobrado *">
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className={INPUT}
              placeholder="0.00"
            />
          </Campo>
          <Campo label="Fecha del pago *">
            <input
              type="date"
              required
              value={fechaPago}
              onChange={(e) => setFechaPago(e.target.value)}
              className={INPUT}
            />
          </Campo>
          <Campo label="Número de recibo">
            <input
              type="text"
              value={recibo}
              onChange={(e) => setRecibo(e.target.value)}
              className={INPUT}
              placeholder="Ej: 001234"
            />
          </Campo>
          <Campo label="Método de pago">
            <select value={metodoPagoId} onChange={(e) => setMetodoPagoId(e.target.value)} className={INPUT}>
              <option value="">— Seleccionar —</option>
              {metodos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Observaciones" className="sm:col-span-2">
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              className={`${INPUT} resize-none`}
              placeholder="Folio de convenio, descuento especial, etc."
            />
          </Campo>
        </div>
      </section>

      {/* Botones */}
      <div className="flex gap-3 justify-end">
        <a href="/pagos"
          className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-bg-card transition-colors">
          Cancelar
        </a>
        <button
          type="submit"
          disabled={loading || !usuarioSel}
          className="px-5 py-2.5 bg-primary hover:bg-secondary text-white rounded-lg text-sm font-semibold
                     transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando...' : 'Registrar pago'}
        </button>
      </div>
    </form>
  );
}

function Campo({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <label className="block text-sm font-medium text-text">{label}</label>
      {children}
    </div>
  );
}
