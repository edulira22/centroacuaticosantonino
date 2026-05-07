import { createClient } from '@/lib/supabase/server';
import { ScrollText } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

export const metadata = { title: 'Bitácora — AquaControl' };

const PAGE_SIZE = 50;

// ─── etiquetas y colores ──────────────────────────────────────────────────────

const ACCION_LABELS: Record<string, string> = {
  alta_usuario:                    'Alta de usuario',
  edicion_usuario:                 'Edición de usuario',
  baja_usuario:                    'Baja de usuario',
  reactivacion_usuario:            'Reactivación',
  cambio_estatus:                  'Cambio de estatus',
  cambio_horario:                  'Cambio de horario',
  registro_pago:                   'Registro de pago',
  anulacion_pago:                  'Anulación de pago',
  correccion_pago:                 'Corrección de pago',
  registro_asistencia:             'Registro de entrada',
  asistencia_duplicada_autorizada: 'Entrada duplicada',
  alta_nota:                       'Alta de nota',
  registro_incidente:              'Incidente enfermería',
  login:                           'Inicio de sesión',
  cambio_rol:                      'Cambio de rol',
};

const ACCION_COLOR: Record<string, string> = {
  alta_usuario:                    'bg-green-50 text-vigente border-vigente/20',
  edicion_usuario:                 'bg-blue-50 text-secondary border-secondary/20',
  baja_usuario:                    'bg-red-50 text-vencido border-vencido/20',
  reactivacion_usuario:            'bg-green-50 text-vigente border-vigente/20',
  cambio_estatus:                  'bg-amber-50 text-prorroga border-prorroga/20',
  cambio_horario:                  'bg-blue-50 text-secondary border-secondary/20',
  registro_pago:                   'bg-amber-50 text-prorroga border-prorroga/20',
  anulacion_pago:                  'bg-red-50 text-vencido border-vencido/20',
  correccion_pago:                 'bg-amber-50 text-prorroga border-prorroga/20',
  registro_asistencia:             'bg-bg-card text-secondary border-accent/20',
  asistencia_duplicada_autorizada: 'bg-amber-50 text-prorroga border-prorroga/20',
  alta_nota:                       'bg-blue-50 text-secondary border-secondary/20',
  registro_incidente:              'bg-red-50 text-vencido border-vencido/20',
  login:                           'bg-bg-card text-text-muted border-gray-200',
  cambio_rol:                      'bg-purple-50 text-purple-700 border-purple-200',
};

const TABLA_LABELS: Record<string, string> = {
  usuarios:              'Usuarios',
  pagos:                 'Pagos',
  asistencias:           'Asistencias',
  bajas:                 'Bajas',
  notas:                 'Notas',
  incidentes_enfermeria: 'Enfermería',
  bitacora:              'Bitácora',
};

const TABLAS_FILTRO = [
  'usuarios', 'pagos', 'asistencias', 'bajas', 'notas', 'incidentes_enfermeria',
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function badgeAccion(accion: string) {
  const label = ACCION_LABELS[accion] ?? accion;
  const cls   = ACCION_COLOR[accion] ?? 'bg-gray-50 text-text-muted border-gray-200';
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full border font-medium ${cls}`}>
      {label}
    </span>
  );
}

function JsonCollapse({ label, value }: { label: string; value: Record<string, unknown> | null }) {
  if (!value) return <span className="text-xs text-text-muted italic">null</span>;
  return (
    <details className="text-xs">
      <summary className="cursor-pointer text-secondary hover:underline select-none">{label}</summary>
      <pre className="mt-1 p-2 bg-gray-50 rounded text-xs text-text-muted overflow-x-auto max-h-40 whitespace-pre-wrap break-all">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

interface SearchParams {
  tabla?: string;
  q?: string;
  pagina?: string;
}

export default async function BitacoraPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params   = await searchParams;
  const pagina   = Math.max(1, Number(params.pagina ?? '1'));
  const offset   = (pagina - 1) * PAGE_SIZE;
  const tabla    = params.tabla ?? '';
  const q        = params.q?.trim() ?? '';

  const supabase = await createClient();

  let query = supabase
    .from('bitacora')
    .select('id, fecha_hora, accion, tabla_afectada, id_registro, usuario_sistema, valor_anterior, valor_nuevo, motivo', { count: 'exact' })
    .order('fecha_hora', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (tabla) query = query.eq('tabla_afectada', tabla);
  if (q)     query = query.ilike('accion', `%${q}%`);

  const { data: entradas, count } = await query;

  const totalPaginas = Math.ceil((count ?? 0) / PAGE_SIZE);

  function buildHref(overrides: Partial<SearchParams>) {
    const p = new URLSearchParams();
    const merged = { tabla, pagina: String(pagina), ...overrides };
    if (merged.tabla)  p.set('tabla',  merged.tabla);
    if (q && !overrides.hasOwnProperty('q')) p.set('q', q);
    if (overrides.q)   p.set('q', overrides.q);
    if (Number(merged.pagina) > 1) p.set('pagina', merged.pagina);
    const qs = p.toString();
    return `/bitacora${qs ? `?${qs}` : ''}`;
  }

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div>
        <h1 className="font-display text-2xl font-bold text-primary flex items-center gap-2">
          <ScrollText size={22} className="text-secondary" />
          Bitácora
        </h1>
        <p className="text-text-muted text-sm mt-0.5">
          Auditoría completa · {count ?? 0} registro{count !== 1 ? 's' : ''}
          {tabla && ` · ${TABLA_LABELS[tabla] ?? tabla}`}
        </p>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3 items-end">
        {/* Tabla */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-text-muted">Tabla</label>
          <div className="flex gap-2 flex-wrap">
            <Link
              href={buildHref({ tabla: '', pagina: '1' })}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors
                ${!tabla ? 'bg-primary text-white border-primary' : 'border-gray-200 text-text-muted hover:border-secondary hover:text-secondary'}`}
            >
              Todas
            </Link>
            {TABLAS_FILTRO.map((t) => (
              <Link
                key={t}
                href={buildHref({ tabla: t, pagina: '1' })}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors capitalize
                  ${tabla === t ? 'bg-primary text-white border-primary' : 'border-gray-200 text-text-muted hover:border-secondary hover:text-secondary'}`}
              >
                {TABLA_LABELS[t] ?? t}
              </Link>
            ))}
          </div>
        </div>

        {/* Búsqueda por acción */}
        <form method="GET" action="/bitacora" className="flex gap-2 ml-auto">
          {tabla && <input type="hidden" name="tabla" value={tabla} />}
          <input
            name="q"
            defaultValue={q}
            type="search"
            placeholder="Buscar acción..."
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary w-44"
          />
          <button type="submit"
            className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-secondary transition-colors">
            Buscar
          </button>
        </form>
      </div>

      {/* Tabla de entradas */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {entradas && entradas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="text-left px-4 py-3 font-semibold text-xs">Fecha / Hora</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs">Acción</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs hidden md:table-cell">Tabla</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs hidden lg:table-cell">Registro</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs hidden lg:table-cell">Operador</th>
                  <th className="text-left px-4 py-3 font-semibold text-xs">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {entradas.map((e, i) => {
                  const fecha = parseISO(e.fecha_hora as string);
                  return (
                    <tr
                      key={e.id}
                      className={`border-t border-gray-50 hover:bg-bg-card/40 align-top
                        ${i % 2 === 1 ? 'bg-bg-card/20' : ''}`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-text font-medium text-xs">
                          {format(fecha, 'dd/MM/yyyy', { locale: es })}
                        </p>
                        <p className="text-text-muted text-xs font-mono">
                          {format(fecha, 'HH:mm:ss')}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {badgeAccion(e.accion as string)}
                        {e.motivo && (
                          <p className="text-xs text-text-muted mt-1 max-w-48 truncate" title={e.motivo as string}>
                            {e.motivo as string}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-text-muted capitalize">
                          {TABLA_LABELS[(e.tabla_afectada as string)] ?? (e.tabla_afectada as string)}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="font-mono text-xs text-text-muted">
                          {(e.id_registro as string).slice(0, 8)}…
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="font-mono text-xs text-text-muted">
                          {(e.usuario_sistema as string).slice(0, 8)}…
                        </span>
                      </td>
                      <td className="px-4 py-3 space-y-1">
                        <JsonCollapse
                          label="Antes"
                          value={e.valor_anterior as Record<string, unknown> | null}
                        />
                        <JsonCollapse
                          label="Después"
                          value={e.valor_nuevo as Record<string, unknown> | null}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-text-muted">No hay entradas en la bitácora para estos filtros.</p>
          </div>
        )}
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">Página {pagina} de {totalPaginas}</p>
          <div className="flex gap-2">
            {pagina > 1 && (
              <Link href={buildHref({ pagina: String(pagina - 1) })}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-bg-card transition-colors">
                Anterior
              </Link>
            )}
            {pagina < totalPaginas && (
              <Link href={buildHref({ pagina: String(pagina + 1) })}
                className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-secondary transition-colors">
                Siguiente
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
