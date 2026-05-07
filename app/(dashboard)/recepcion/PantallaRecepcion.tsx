'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { buscarParaRecepcion, registrarAsistencia, type ResultadoBusqueda } from './actions';
import { calcularEstatusCliente, type VigenciaCliente } from './vigenciaCliente';
import { AvatarUsuario } from '@/components/usuarios/AvatarUsuario';
import {
  Search, CheckCircle2, XCircle, AlertTriangle, Lock,
  Clock, CreditCard, Loader2, RotateCcw, ArrowLeft,
} from 'lucide-react';

// ============================================================
// Config visual por estatus
// ============================================================
const ESTATUS_CONFIG = {
  activo: {
    bg:          'bg-green-50  border-vigente',
    headerBg:    'bg-vigente',
    titulo:      '✅ ACCESO PERMITIDO',
    subtitulo:   'Usuario con pago vigente',
    btnClasses:  'bg-vigente hover:bg-green-600 text-white',
    btnHabilitado: true,
  },
  prorroga: {
    bg:          'bg-amber-50  border-prorroga',
    headerBg:    'bg-prorroga',
    titulo:      '⚠️ PRÓRROGA ACTIVA',
    subtitulo:   'Autorizado por administración',
    btnClasses:  'bg-prorroga hover:bg-amber-600 text-white',
    btnHabilitado: true,
  },
  vencido: {
    bg:          'bg-red-50    border-vencido',
    headerBg:    'bg-vencido',
    titulo:      '🚫 PAGO VENCIDO',
    subtitulo:   'Cobrar antes de ingresar — puede autorizar con observación',
    btnClasses:  'bg-vencido   hover:bg-red-600   text-white',
    btnHabilitado: true,   // puede entrar con advertencia visible
  },
  pendiente: {
    bg:          'bg-blue-50   border-secondary',
    headerBg:    'bg-secondary',
    titulo:      '🕐 PENDIENTE',
    subtitulo:   'Usuario sin pago registrado',
    btnClasses:  'bg-secondary hover:bg-primary   text-white',
    btnHabilitado: true,
  },
  baja: {
    bg:          'bg-gray-100  border-inactivo',
    headerBg:    'bg-inactivo',
    titulo:      '🔒 USUARIO INACTIVO',
    subtitulo:   'Verificar con administración',
    btnClasses:  'bg-inactivo cursor-not-allowed  text-white',
    btnHabilitado: false,
  },
  suspendido: {
    bg:          'bg-gray-100  border-inactivo',
    headerBg:    'bg-inactivo',
    titulo:      '🔒 SUSPENDIDO',
    subtitulo:   'Verificar con administración',
    btnClasses:  'bg-inactivo cursor-not-allowed  text-white',
    btnHabilitado: false,
  },
} as const;

type EstatusKey = keyof typeof ESTATUS_CONFIG;

// ============================================================
// Componente principal
// ============================================================
export function PantallaRecepcion() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [usuarioSel, setUsuarioSel] = useState<ResultadoBusqueda | null>(null);
  const [vigencia, setVigencia] = useState<VigenciaCliente | null>(null);
  const [cargandoVigencia, setCargandoVigencia] = useState(false);

  // Estado del check-in
  const [registrando, setRegistrando] = useState(false);
  const [exito, setExito] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [duplicado, setDuplicado] = useState(false);
  const [obsrDuplicado, setObsrDuplicado] = useState('');

  // Foco automático al inicio y al volver a búsqueda
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Búsqueda debounced
  const buscar = useCallback(async (q: string) => {
    if (q.trim().length < 1) { setResultados([]); return; }
    setBuscando(true);
    const res = await buscarParaRecepcion(q);
    setResultados(res);
    setBuscando(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => buscar(query), 220);
    return () => clearTimeout(t);
  }, [query, buscar]);

  // Al seleccionar usuario: calcular vigencia
  async function seleccionarUsuario(u: ResultadoBusqueda) {
    setUsuarioSel(u);
    setResultados([]);
    setQuery('');
    setExito(false);
    setErrorMsg(null);
    setDuplicado(false);
    setObsrDuplicado('');
    setCargandoVigencia(true);
    const v = await calcularEstatusCliente(u.id);
    setVigencia(v);
    setCargandoVigencia(false);
  }

  function resetear() {
    setUsuarioSel(null);
    setVigencia(null);
    setExito(false);
    setErrorMsg(null);
    setDuplicado(false);
    setObsrDuplicado('');
    setQuery('');
    setTimeout(() => inputRef.current?.focus(), 80);
  }

  async function handleRegistrar(forzar = false) {
    if (!usuarioSel) return;
    setRegistrando(true);
    setErrorMsg(null);

    const res = await registrarAsistencia({
      usuario_id: usuarioSel.id,
      forzar_duplicado: forzar,
      observacion_duplicado: forzar ? obsrDuplicado : undefined,
    });

    setRegistrando(false);

    if (res.ok) {
      setExito(true);
      setDuplicado(false);
      // Volver a búsqueda automáticamente después de 2.5 s
      setTimeout(() => resetear(), 2500);
    } else if (res.duplicado) {
      setDuplicado(true);
      setErrorMsg(res.error ?? null);
    } else {
      setErrorMsg(res.error ?? 'Error al registrar');
    }
  }

  const cfg = ESTATUS_CONFIG[(vigencia?.estatus ?? usuarioSel?.estatus ?? 'pendiente') as EstatusKey]
    ?? ESTATUS_CONFIG.pendiente;

  // ─── Pantalla de BÚSQUEDA ────────────────────────────────
  if (!usuarioSel) {
    return (
      <div className="flex flex-col items-center justify-start min-h-[70vh] pt-16 px-4">
        <div className="w-full max-w-xl space-y-6">
          {/* Título */}
          <div className="text-center">
            <h1 className="font-display text-3xl font-bold text-primary">Recepción</h1>
            <p className="text-text-muted mt-1">Busca al usuario por credencial o nombre</p>
          </div>

          {/* Campo de búsqueda grande */}
          <div className="relative">
            {buscando
              ? <Loader2 size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-secondary animate-spin" />
              : <Search size={22} className="absolute left-5 top-1/2 -translate-y-1/2 text-text-muted" />
            }
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && resultados.length === 1) seleccionarUsuario(resultados[0]);
              }}
              placeholder="Número de credencial o nombre..."
              className="w-full pl-14 pr-5 py-5 text-xl border-2 border-gray-200 rounded-2xl
                         shadow-sm focus:outline-none focus:border-secondary focus:ring-4
                         focus:ring-secondary/10 transition-all"
              autoComplete="off"
            />
          </div>

          {/* Resultados de búsqueda */}
          {resultados.length > 0 && (
            <ul className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden divide-y divide-gray-50">
              {resultados.map((u) => (
                <li key={u.id}>
                  <button
                    onClick={() => seleccionarUsuario(u)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-bg-card transition-colors text-left"
                  >
                    <AvatarUsuario nombre={u.nombre} apellido={u.apellido_paterno} fotoUrl={u.foto_url} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text text-lg leading-tight">
                        {u.nombre} {u.apellido_paterno}
                        {u.apellido_materno ? ` ${u.apellido_materno}` : ''}
                      </p>
                      <p className="text-sm text-text-muted">
                        {u.numero_credencial ? `#${u.numero_credencial}` : 'Sin credencial'}
                        {u.horarios?.nombre ? ` · ${u.horarios.nombre}` : ''}
                      </p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      u.estatus === 'activo'     ? 'bg-green-100 text-vigente'   :
                      u.estatus === 'vencido'    ? 'bg-red-100   text-vencido'   :
                      u.estatus === 'prorroga'   ? 'bg-amber-100 text-prorroga'  :
                      'bg-gray-100 text-inactivo'
                    }`}>
                      {u.estatus}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {query.trim().length > 0 && !buscando && resultados.length === 0 && (
            <p className="text-center text-text-muted py-6">
              No se encontraron usuarios con <strong>&quot;{query}&quot;</strong>
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─── Pantalla de FICHA (check-in) ───────────────────────
  const nombreCompleto = `${usuarioSel.nombre} ${usuarioSel.apellido_paterno}${usuarioSel.apellido_materno ? ` ${usuarioSel.apellido_materno}` : ''}`;

  return (
    <div className="flex flex-col items-center justify-start min-h-[70vh] pt-8 px-4">
      <div className="w-full max-w-lg space-y-4">

        {/* Botón volver */}
        <button onClick={resetear} className="flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors">
          <ArrowLeft size={14} /> Nueva búsqueda
        </button>

        {/* ═══ FICHA PRINCIPAL ══════════════════════════════ */}
        <div className={`rounded-2xl border-2 overflow-hidden shadow-md ${cfg.bg}`}>

          {/* Header de estatus — visible desde 1 metro */}
          <div className={`${cfg.headerBg} px-6 py-4`}>
            <p className="text-white font-display font-bold text-2xl tracking-tight">
              {cfg.titulo}
            </p>
            <p className="text-white/80 text-sm mt-0.5">{cfg.subtitulo}</p>
          </div>

          {/* Datos del usuario */}
          <div className="px-6 py-5 space-y-4">
            {/* Avatar + nombre */}
            <div className="flex items-center gap-4">
              <AvatarUsuario nombre={usuarioSel.nombre} apellido={usuarioSel.apellido_paterno} fotoUrl={usuarioSel.foto_url} size="xl" />
              <div>
                <h2 className="font-display font-bold text-2xl text-text leading-tight">{nombreCompleto}</h2>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {usuarioSel.numero_credencial && (
                    <span className="font-mono text-sm text-secondary bg-white/80 border border-accent/30 px-2.5 py-0.5 rounded">
                      #{usuarioSel.numero_credencial}
                    </span>
                  )}
                  {usuarioSel.horarios?.nombre && (
                    <span className="flex items-center gap-1 text-sm text-text-muted">
                      <Clock size={13} /> {usuarioSel.horarios.nombre}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Vigencia en tiempo real */}
            {cargandoVigencia ? (
              <div className="flex items-center gap-2 text-text-muted py-2">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Verificando vigencia...</span>
              </div>
            ) : vigencia && (
              <div className="grid grid-cols-2 gap-3">
                {vigencia.vigente_hasta && (
                  <DatoFicha icon={<CreditCard size={14} />} label="Vigente hasta" value={vigencia.vigente_hasta} />
                )}
                {vigencia.estatus === 'vencido' && vigencia.dias_vencido > 0 && (
                  <DatoFicha icon={<XCircle size={14} />} label="Días vencido" value={`${vigencia.dias_vencido} días`} alert />
                )}
                {vigencia.ultimo_pago && (
                  <DatoFicha icon={<CreditCard size={14} />} label="Último pago" value={`$${Number(vigencia.ultimo_pago.monto).toFixed(2)}`} />
                )}
                {vigencia.ultimo_pago?.numero_recibo && (
                  <DatoFicha icon={<CreditCard size={14} />} label="Recibo" value={vigencia.ultimo_pago.numero_recibo} />
                )}
              </div>
            )}

            {/* Observación importante del usuario */}
            {usuarioSel.observaciones && (
              <div className="bg-amber-50 border border-prorroga/30 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">Nota del usuario</p>
                <p className="text-sm text-text">{usuarioSel.observaciones}</p>
              </div>
            )}

            {/* Éxito de registro */}
            {exito && (
              <div className="flex items-center gap-3 bg-green-50 border border-vigente/30 rounded-xl px-4 py-4">
                <CheckCircle2 size={28} className="text-vigente shrink-0" />
                <div>
                  <p className="font-bold text-vigente text-lg">¡Entrada registrada!</p>
                  <p className="text-sm text-text-muted">Volviendo a búsqueda automáticamente...</p>
                </div>
              </div>
            )}

            {/* Error general */}
            {errorMsg && !duplicado && (
              <div className="bg-red-50 border border-vencido/30 rounded-xl px-4 py-3 text-sm text-vencido">
                {errorMsg}
              </div>
            )}

            {/* Panel de duplicado */}
            {duplicado && (
              <div className="bg-amber-50 border border-prorroga/30 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-2 text-amber-700">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  <p className="font-semibold text-sm">{errorMsg}</p>
                </div>
                <textarea
                  value={obsrDuplicado}
                  onChange={(e) => setObsrDuplicado(e.target.value)}
                  rows={2}
                  placeholder="Motivo de la segunda entrada (opcional)..."
                  className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm resize-none focus:outline-none focus:border-prorroga"
                />
                <button
                  onClick={() => handleRegistrar(true)}
                  disabled={registrando}
                  className="w-full py-3 bg-prorroga hover:bg-amber-600 text-white font-bold rounded-xl transition-colors disabled:opacity-60"
                >
                  {registrando ? 'Registrando...' : 'Confirmar segunda entrada'}
                </button>
              </div>
            )}

            {/* ══ BOTÓN PRINCIPAL DE ENTRADA ══════════════════ */}
            {!exito && !duplicado && (
              <button
                onClick={() => handleRegistrar(false)}
                disabled={registrando || !cfg.btnHabilitado}
                className={`w-full py-5 rounded-xl font-display font-bold text-2xl tracking-tight
                            transition-all duration-150 active:scale-[0.98] shadow-sm
                            disabled:opacity-50 disabled:cursor-not-allowed
                            flex items-center justify-center gap-3 ${cfg.btnClasses}`}
              >
                {registrando ? (
                  <><Loader2 size={24} className="animate-spin" /> Registrando...</>
                ) : !cfg.btnHabilitado ? (
                  <><Lock size={24} /> ACCESO BLOQUEADO</>
                ) : (
                  <><CheckCircle2 size={28} /> REGISTRAR ENTRADA</>
                )}
              </button>
            )}

            {/* Botón reiniciar si ya está el éxito */}
            {exito && (
              <button onClick={resetear}
                className="w-full py-3 border-2 border-vigente text-vigente font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-green-50 transition-colors">
                <RotateCcw size={18} /> Siguiente usuario
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helper visual ───────────────────────────────────────────
function DatoFicha({ icon, label, value, alert }: { icon: React.ReactNode; label: string; value: string; alert?: boolean }) {
  return (
    <div className="bg-white/70 rounded-xl px-3 py-2.5">
      <div className={`flex items-center gap-1.5 text-xs mb-0.5 ${alert ? 'text-vencido' : 'text-text-muted'}`}>
        {icon} {label}
      </div>
      <p className={`font-semibold text-sm ${alert ? 'text-vencido' : 'text-text'}`}>{value}</p>
    </div>
  );
}
