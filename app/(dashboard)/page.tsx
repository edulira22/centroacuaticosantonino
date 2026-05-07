import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  Users,
  CreditCard,
  CheckSquare,
  AlertTriangle,
  Clock,
  PlusCircle,
  Dumbbell,
  TrendingUp,
} from 'lucide-react';
import { format, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

export const metadata = { title: 'Dashboard — AquaControl' };

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtHora(iso: string | null) {
  if (!iso) return '—';
  return iso.slice(11, 16); // "HH:MM" from ISO
}

function fmtMonto(n: number) {
  return n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── sub-components ─────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  accent,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
  accent?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border p-5 flex items-start gap-4 ${accent ? 'border-secondary/30' : 'border-gray-100'}`}>
      <div className={`p-3 rounded-xl shrink-0 ${iconBg}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-text-muted text-sm">{title}</p>
        <p className="font-display text-2xl font-bold text-text mt-0.5 tabular-nums">{value}</p>
        <p className="text-text-muted text-xs mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

function AccionRapida({
  href,
  icon,
  label,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-bg-card border border-transparent
                 hover:border-accent/20 transition-all group"
    >
      <div className="p-2 rounded-lg bg-bg-card group-hover:bg-accent/20 transition-colors text-secondary">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-text">{label}</p>
        <p className="text-xs text-text-muted">{desc}</p>
      </div>
    </Link>
  );
}

// ─── page ────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();
  const hoy = new Date();
  const hoyISO = format(hoy, 'yyyy-MM-dd');
  const mesActual = format(startOfMonth(hoy), 'yyyy-MM-dd');
  const mesLabel = format(hoy, 'MMMM yyyy', { locale: es });

  // Todas las queries en paralelo
  const [
    pagosDelMesRes,
    totalPotencialesRes,
    asistenciasHoyRes,
    ultimasEntradasRes,
    ultimosPagosRes,
  ] = await Promise.all([
    // Pagos no anulados del mes → vigentes + ingresos
    supabase
      .from('pagos')
      .select('usuario_id, monto')
      .eq('periodo_mes', mesActual)
      .eq('anulado', false),

    // Usuarios que pueden estar activos (no baja ni suspendido)
    supabase
      .from('usuarios')
      .select('id', { count: 'exact', head: true })
      .not('estatus', 'in', '(baja,suspendido)'),

    // Asistencias de hoy
    supabase
      .from('asistencias')
      .select('id', { count: 'exact', head: true })
      .eq('fecha', hoyISO),

    // Últimas entradas del día
    supabase
      .from('asistencias')
      .select('id, hora_entrada, estatus_al_momento, usuarios(id, nombre, apellido_paterno, numero_credencial)')
      .eq('fecha', hoyISO)
      .order('hora_entrada', { ascending: false })
      .limit(10),

    // Últimos pagos registrados (cualquier mes)
    supabase
      .from('pagos')
      .select('id, fecha_pago, monto, numero_recibo, usuarios(id, nombre, apellido_paterno), paquetes(nombre)')
      .eq('anulado', false)
      .order('created_at', { ascending: false })
      .limit(6),
  ]);

  // Calcular métricas
  const pagosDelMes = pagosDelMesRes.data ?? [];
  const vigentes = new Set(pagosDelMes.map((p) => p.usuario_id)).size;
  const ingresosMes = pagosDelMes.reduce((acc, p) => acc + Number(p.monto), 0);
  const totalPotenciales = totalPotencialesRes.count ?? 0;
  const sinPago = Math.max(0, totalPotenciales - vigentes);
  const asistenciasHoy = asistenciasHoyRes.count ?? 0;
  const ultimasEntradas = ultimasEntradasRes.data ?? [];
  const ultimosPagos = ultimosPagosRes.data ?? [];

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary">Dashboard</h1>
          <p className="text-text-muted text-sm mt-0.5 capitalize">
            {format(hoy, "EEEE d 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <Link
          href="/recepcion"
          className="flex items-center gap-2 bg-primary hover:bg-secondary text-white px-4 py-2.5
                     rounded-lg text-sm font-semibold transition-colors"
        >
          <Dumbbell size={16} />
          Ir a Recepción
        </Link>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Vigentes este mes"
          value={vigentes}
          subtitle={`De ${totalPotenciales} usuarios inscritos`}
          icon={<Users size={20} className="text-secondary" />}
          iconBg="bg-bg-card"
          accent
        />
        <StatCard
          title="Asistencias hoy"
          value={asistenciasHoy}
          subtitle={format(hoy, "d 'de' MMMM", { locale: es })}
          icon={<CheckSquare size={20} className="text-vigente" />}
          iconBg="bg-green-50"
        />
        <StatCard
          title="Sin pago este mes"
          value={sinPago}
          subtitle="Acceso vencido o pendiente"
          icon={<AlertTriangle size={20} className="text-vencido" />}
          iconBg="bg-red-50"
        />
        <StatCard
          title="Ingresos del mes"
          value={`$${fmtMonto(ingresosMes)}`}
          subtitle={mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1)}
          icon={<CreditCard size={20} className="text-prorroga" />}
          iconBg="bg-amber-50"
        />
      </div>

      {/* Fila inferior: entradas + actividad reciente */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* Últimas entradas del día */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-secondary" />
              <h2 className="font-display font-semibold text-text text-sm">Entradas de hoy</h2>
            </div>
            <Link href="/asistencias" className="text-xs text-secondary hover:underline">
              Ver todas →
            </Link>
          </div>

          {ultimasEntradas.length > 0 ? (
            <ul className="divide-y divide-gray-50">
              {ultimasEntradas.map((a, i) => {
                const u = (a.usuarios as unknown) as {
                  id: string;
                  nombre: string;
                  apellido_paterno: string;
                  numero_credencial: string | null;
                } | null;
                const esActivo = a.estatus_al_momento === 'activo';
                return (
                  <li
                    key={a.id}
                    className={`px-5 py-3 flex items-center gap-4 hover:bg-bg-card/40 transition-colors
                                ${i % 2 === 1 ? 'bg-bg-card/20' : ''}`}
                  >
                    <span className="text-xs font-mono text-text-muted w-10 shrink-0">
                      {fmtHora(a.hora_entrada as string | null)}
                    </span>
                    <div className="flex-1 min-w-0">
                      {u ? (
                        <Link href={`/usuarios/${u.id}`} className="hover:text-secondary transition-colors">
                          <p className="text-sm font-medium text-text truncate">
                            {u.nombre} {u.apellido_paterno}
                          </p>
                          {u.numero_credencial && (
                            <p className="text-xs font-mono text-text-muted">#{u.numero_credencial}</p>
                          )}
                        </Link>
                      ) : (
                        <span className="text-text-muted text-sm">—</span>
                      )}
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full shrink-0 font-medium
                        ${esActivo
                          ? 'bg-green-50 text-vigente border border-vigente/20'
                          : 'bg-red-50 text-vencido border border-vencido/20'
                        }`}
                    >
                      {a.estatus_al_momento ?? '—'}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="px-5 py-10 text-center">
              <p className="text-text-muted text-sm">Sin entradas registradas hoy.</p>
              <Link href="/recepcion" className="text-secondary text-sm hover:underline mt-1 inline-block">
                Ir a recepción →
              </Link>
            </div>
          )}
        </div>

        {/* Columna derecha */}
        <div className="lg:col-span-2 space-y-4">

          {/* Acciones rápidas */}
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-secondary" />
              <h2 className="font-display font-semibold text-text text-sm">Acciones rápidas</h2>
            </div>
            <div className="space-y-1">
              <AccionRapida
                href="/recepcion"
                icon={<Dumbbell size={16} />}
                label="Registrar entrada"
                desc="Check-in de asistencia"
              />
              <AccionRapida
                href="/pagos/nuevo"
                icon={<PlusCircle size={16} />}
                label="Registrar pago"
                desc="Nuevo pago de mensualidad"
              />
              <AccionRapida
                href="/usuarios/nuevo"
                icon={<Users size={16} />}
                label="Nuevo usuario"
                desc="Alta de socio"
              />
            </div>
          </div>

          {/* Últimos pagos */}
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-secondary" />
                <h2 className="font-display font-semibold text-text text-sm">Últimos pagos</h2>
              </div>
              <Link href="/pagos" className="text-xs text-secondary hover:underline">
                Ver todos →
              </Link>
            </div>
            {ultimosPagos.length > 0 ? (
              <ul className="divide-y divide-gray-50">
                {ultimosPagos.map((p) => {
                  const u = (p.usuarios as unknown) as { id: string; nombre: string; apellido_paterno: string } | null;
                  const paq = (p.paquetes as unknown) as { nombre: string } | null;
                  return (
                    <li key={p.id} className="px-5 py-3 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {u ? (
                          <Link href={`/usuarios/${u.id}`} className="hover:text-secondary transition-colors">
                            <p className="text-sm font-medium text-text truncate">
                              {u.nombre} {u.apellido_paterno}
                            </p>
                          </Link>
                        ) : <span className="text-text-muted text-sm">—</span>}
                        <p className="text-xs text-text-muted truncate">{paq?.nombre ?? '—'}</p>
                      </div>
                      <span className="font-mono text-sm font-semibold text-text shrink-0">
                        ${fmtMonto(Number(p.monto))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-5 py-6 text-center">
                <p className="text-text-muted text-sm">Sin pagos registrados.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
