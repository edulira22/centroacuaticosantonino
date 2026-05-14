'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle2, XCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface EntradaViva {
  id: string;
  ts: Date;
  numero_credencial: string | null;
  nombre: string;
  apellido_paterno: string;
  estatus_al_momento: string;
  paquete: string | null;
  horario: string | null;
  datosOcultos: boolean; // true pasados 6 s (o siempre en modo discreto)
}

interface UsuarioJoin {
  numero_credencial: string | null;
  nombre: string;
  apellido_paterno: string;
  paquetes: { nombre: string } | null;
  horarios: { nombre: string } | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cfgEstatus(estatus: string) {
  if (estatus === 'activo')
    return {
      label: 'ACCESO PERMITIDO',
      Icon: CheckCircle2,
      border: 'border-emerald-500',
      glow: 'shadow-emerald-900',
      bg: 'bg-emerald-950/60',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      dot: 'bg-emerald-400',
    };
  if (estatus === 'pendiente' || estatus === 'prorroga')
    return {
      label: 'VERIFICAR PAGO',
      Icon: AlertCircle,
      border: 'border-amber-500',
      glow: 'shadow-amber-900',
      bg: 'bg-amber-950/60',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      dot: 'bg-amber-400',
    };
  return {
    label: 'ACCESO DENEGADO',
    Icon: XCircle,
    border: 'border-red-500',
    glow: 'shadow-red-900',
    bg: 'bg-red-950/60',
    badge: 'bg-red-500/20 text-red-300 border-red-500/40',
    dot: 'bg-red-400',
  };
}

function fmt12(date: Date) {
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
}

function fmtCorto(date: Date) {
  return new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit', hour12: true }).format(date);
}

// ─── Hero (última entrada) ────────────────────────────────────────────────────

function HeroCard({ entrada, discreto }: { entrada: EntradaViva; discreto: boolean }) {
  const cfg = cfgEstatus(entrada.estatus_al_momento);
  const { Icon } = cfg;
  const verDatos = !discreto && !entrada.datosOcultos;

  return (
    <div
      className={`
        rounded-2xl border-2 ${cfg.border} ${cfg.bg} ${cfg.glow}
        shadow-[0_0_60px_-10px] p-8 md:p-14
        flex flex-col items-center gap-6 text-center
        transition-all duration-700
      `}
    >
      {/* Badge de estado */}
      <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-full border text-sm md:text-base font-bold tracking-widest uppercase ${cfg.badge}`}>
        <Icon size={20} />
        {cfg.label}
      </span>

      {/* ID Credencial — siempre visible */}
      <div>
        <p className="text-gray-500 text-xs uppercase tracking-[0.3em] mb-2">ID Credencial</p>
        <p className="text-white font-black font-mono leading-none"
           style={{ fontSize: 'clamp(4rem, 15vw, 9rem)' }}>
          #{entrada.numero_credencial ?? '—'}
        </p>
      </div>

      {/* Datos personales — desaparecen a los 6 s */}
      <div className={`transition-all duration-500 overflow-hidden ${verDatos ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
        <p className="text-white font-bold text-2xl md:text-4xl">
          {entrada.nombre} {entrada.apellido_paterno}
        </p>
        {(entrada.paquete || entrada.horario) && (
          <p className="text-gray-400 text-base md:text-lg mt-1">
            {[entrada.paquete, entrada.horario].filter(Boolean).join('  ·  ')}
          </p>
        )}
      </div>

      {/* Hora de entrada */}
      <p className="text-gray-600 font-mono text-base md:text-lg">{fmt12(entrada.ts)}</p>
    </div>
  );
}

// ─── Tarjeta en la cola ───────────────────────────────────────────────────────

function QueueCard({ entrada, discreto }: { entrada: EntradaViva; discreto: boolean }) {
  const cfg = cfgEstatus(entrada.estatus_al_momento);
  const { Icon } = cfg;
  const verNombre = !discreto && !entrada.datosOcultos;

  return (
    <div
      className={`
        rounded-xl border ${cfg.border} ${cfg.bg}
        p-3 flex items-center gap-3 shrink-0 w-48
        transition-opacity duration-300
      `}
    >
      <Icon size={18} className={`shrink-0 ${cfg.badge.split(' ')[1]}`} />
      <div className="min-w-0 flex-1">
        <p className="text-white font-mono font-bold text-sm truncate">
          #{entrada.numero_credencial ?? '—'}
        </p>
        {verNombre && (
          <p className="text-gray-400 text-xs truncate">{entrada.nombre}</p>
        )}
        <p className="text-gray-600 text-xs">{fmtCorto(entrada.ts)}</p>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function MonitorPage() {
  const [entradas, setEntradas] = useState<EntradaViva[]>([]);
  const [discreto, setDiscreto] = useState(false);
  const [conectado, setConectado] = useState(false);
  const [ahora, setAhora] = useState(new Date());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Reloj en vivo
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Ocultar datos personales de una entrada después de 6 s
  const ocultarDatos = useCallback((id: string) => {
    setEntradas((prev) => prev.map((e) => (e.id === id ? { ...e, datosOcultos: true } : e)));
  }, []);

  // Agregar nueva entrada al estado y arrancar su timer
  const agregar = useCallback(
    (nueva: Omit<EntradaViva, 'datosOcultos'>) => {
      setEntradas((prev) => [{ ...nueva, datosOcultos: false }, ...prev].slice(0, 20));
      const t = setTimeout(() => ocultarDatos(nueva.id), 6000);
      timers.current.set(nueva.id, t);
    },
    [ocultarDatos]
  );

  useEffect(() => {
    const supabase = createClient();

    // ── Carga inicial: últimas 12 entradas del día ────────────────────────────
    (async () => {
      const hoy = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('asistencias')
        .select(`
          id, estatus_al_momento, created_at,
          usuarios!inner(
            numero_credencial, nombre, apellido_paterno,
            paquetes(nombre), horarios(nombre)
          )
        `)
        .eq('fecha', hoy)
        .order('created_at', { ascending: false })
        .limit(12);

      if (data) {
        setEntradas(
          data.map((a) => {
            const u = a.usuarios as unknown as UsuarioJoin;
            return {
              id: a.id,
              ts: new Date(a.created_at),
              numero_credencial: u.numero_credencial,
              nombre: u.nombre,
              apellido_paterno: u.apellido_paterno,
              estatus_al_momento: a.estatus_al_momento,
              paquete: u.paquetes?.nombre ?? null,
              horario: u.horarios?.nombre ?? null,
              datosOcultos: true, // entradas previas ya sin datos personales
            };
          })
        );
      }
    })();

    // ── Suscripción Realtime ──────────────────────────────────────────────────
    const channel = supabase
      .channel('monitor-fila-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'asistencias' },
        async (payload) => {
          const rec = payload.new as {
            id: string;
            usuario_id: string;
            estatus_al_momento: string;
            created_at: string;
          };

          const { data: u } = await supabase
            .from('usuarios')
            .select('numero_credencial, nombre, apellido_paterno, paquetes(nombre), horarios(nombre)')
            .eq('id', rec.usuario_id)
            .single();

          if (!u) return;

          const usuario = u as unknown as UsuarioJoin;
          agregar({
            id: rec.id,
            ts: new Date(rec.created_at),
            numero_credencial: usuario.numero_credencial,
            nombre: usuario.nombre,
            apellido_paterno: usuario.apellido_paterno,
            estatus_al_momento: rec.estatus_al_momento,
            paquete: usuario.paquetes?.nombre ?? null,
            horario: usuario.horarios?.nombre ?? null,
          });
        }
      )
      .subscribe((status) => setConectado(status === 'SUBSCRIBED'));

    return () => {
      supabase.removeChannel(channel);
      timers.current.forEach((t) => clearTimeout(t));
    };
  }, [agregar]);

  const ultima = entradas[0] ?? null;
  const cola = entradas.slice(1);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col select-none overflow-hidden">

      {/* ── Barra superior ─────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-3 bg-gray-900/80 border-b border-gray-800 shrink-0">
        {/* Indicador de conexión */}
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${conectado ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-gray-500 text-xs">{conectado ? 'En vivo' : 'Conectando...'}</span>
        </div>

        {/* Reloj */}
        <span className="font-mono text-gray-400 text-sm md:text-base">{fmt12(ahora)}</span>

        {/* Toggle modo */}
        <button
          onClick={() => setDiscreto((d) => !d)}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
            border transition-all duration-200
            ${discreto
              ? 'border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700'
              : 'border-blue-700 bg-blue-900/50 text-blue-300 hover:bg-blue-900'}
          `}
        >
          {discreto ? <EyeOff size={13} /> : <Eye size={13} />}
          {discreto ? 'Discreto' : 'Visible'}
        </button>
      </header>

      {/* ── Contenido principal ─────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col gap-6 p-5 md:p-10 overflow-hidden">

        {/* Hero */}
        {ultima ? (
          <HeroCard entrada={ultima} discreto={discreto} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-800">
            <span className="text-5xl">🏊</span>
            <p className="text-gray-600 text-lg font-medium">Esperando registros...</p>
            <p className="text-gray-700 text-sm">El monitor se actualiza automáticamente</p>
          </div>
        )}

        {/* Cola de entradas previas */}
        {cola.length > 0 && (
          <div className="shrink-0">
            <p className="text-gray-700 text-xs uppercase tracking-widest mb-2">Anteriores</p>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {cola.map((e) => (
                <QueueCard key={e.id} entrada={e} discreto={discreto} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
