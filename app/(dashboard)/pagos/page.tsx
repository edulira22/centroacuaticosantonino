import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { PlusCircle } from 'lucide-react';
import { format, parseISO, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';

const PAGE_SIZE = 30;

interface SearchParams {
  mes?: string;     // "YYYY-MM"
  q?: string;       // búsqueda por nombre o recibo
  pagina?: string;
}

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const pagina = Number(params.pagina ?? '1');
  const offset = (pagina - 1) * PAGE_SIZE;

  // Mes por defecto: mes actual
  const hoy = new Date();
  const mesParam = params.mes ?? format(hoy, 'yyyy-MM');
  const periodoISO = `${mesParam}-01`;

  const supabase = await createClient();

  let q = supabase
    .from('pagos')
    .select(`
      id, fecha_pago, monto, periodo_mes, numero_recibo, anulado, created_at,
      usuarios(id, nombre, apellido_paterno, numero_credencial),
      paquetes(nombre, codigo),
      metodos_pago(nombre)
    `, { count: 'exact' })
    .eq('periodo_mes', periodoISO)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  // Búsqueda por nombre de usuario o número de recibo
  if (params.q?.trim()) {
    // Búsqueda en usuario o recibo — filtramos post-fetch (Supabase no hace join-filter directo sin RPC)
    // Aquí hacemos búsqueda simple por recibo; para nombre usamos sub-query
    q = q.ilike('numero_recibo', `%${params.q.trim()}%`);
  }

  const { data: pagos, count } = await q;

  // Totales del mes
  const { data: totales } = await supabase
    .from('pagos')
    .select('monto, anulado')
    .eq('periodo_mes', periodoISO);

  const totalMes = (totales ?? [])
    .filter((p) => !p.anulado)
    .reduce((acc, p) => acc + Number(p.monto), 0);
  const totalAnulados = (totales ?? []).filter((p) => p.anulado).length;

  const totalPaginas = Math.ceil((count ?? 0) / PAGE_SIZE);

  function buildHref(overrides: Partial<SearchParams>) {
    const p = new URLSearchParams();
    const merged = { mes: mesParam, pagina: String(pagina), ...overrides };
    Object.entries(merged).forEach(([k, v]) => { if (v && v !== '1') p.set(k, v); });
    const qs = p.toString();
    return `/pagos${qs ? `?${qs}` : ''}`;
  }

  // Generar meses para el selector (últimos 12 + próximos 2)
  const meses: string[] = [];
  for (let i = -11; i <= 2; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
    meses.push(format(d, 'yyyy-MM'));
  }

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary">Pagos</h1>
          <p className="text-text-muted text-sm mt-0.5 capitalize">
            {format(parseISO(periodoISO), 'MMMM yyyy', { locale: es })}
            {' · '}{count ?? 0} registro{count !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/pagos/nuevo"
          className="flex items-center gap-2 bg-primary hover:bg-secondary text-white px-4 py-2.5
                     rounded-lg text-sm font-semibold transition-colors"
        >
          <PlusCircle size={16} />
          Registrar pago
        </Link>
      </div>

      {/* Resumen del mes */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-text-muted text-xs">Total cobrado</p>
          <p className="font-display font-bold text-2xl text-primary font-mono">
            ${totalMes.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-text-muted text-xs">Pagos registrados</p>
          <p className="font-display font-bold text-2xl text-text">
            {(totales ?? []).filter((p) => !p.anulado).length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-text-muted text-xs">Anulados</p>
          <p className="font-display font-bold text-2xl text-vencido">{totalAnulados}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex gap-3 flex-wrap items-center">
        {/* Selector de mes */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-text-muted">Mes:</label>
          <select
            defaultValue={mesParam}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-secondary"
            onChange={undefined}
            data-nav="mes"
          >
            {meses.map((m) => (
              <option key={m} value={m}>
                {format(parseISO(`${m}-01`), 'MMM yyyy', { locale: es })}
              </option>
            ))}
          </select>
        </div>

        {/* Búsqueda por recibo */}
        <form method="GET" action="/pagos" className="flex gap-2 flex-1 min-w-48">
          <input type="hidden" name="mes" value={mesParam} />
          <input
            name="q"
            defaultValue={params.q ?? ''}
            type="search"
            placeholder="Buscar por número de recibo..."
            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm
                       focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary"
          />
          <button type="submit"
            className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-secondary transition-colors">
            Buscar
          </button>
        </form>
      </div>

      {/* Tabla de pagos */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {pagos && pagos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="text-left px-4 py-3 font-semibold">Usuario</th>
                  <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Fecha pago</th>
                  <th className="text-left px-4 py-3 font-semibold">Monto</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Paquete</th>
                  <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Recibo</th>
                  <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Método</th>
                  <th className="text-left px-4 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((p, i) => {
                  const usuario = (p.usuarios as unknown) as { id: string; nombre: string; apellido_paterno: string; numero_credencial: string | null } | null;
                  const paquete = (p.paquetes as unknown) as { nombre: string; codigo: string | null } | null;
                  const metodo  = (p.metodos_pago as unknown) as { nombre: string } | null;

                  return (
                    <tr key={p.id} className={`border-t border-gray-50 hover:bg-bg-card/40 ${i % 2 === 1 ? 'bg-bg-card/30' : ''} ${p.anulado ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3">
                        {usuario ? (
                          <Link href={`/usuarios/${usuario.id}`} className="hover:text-secondary transition-colors">
                            <p className="font-medium text-text">
                              {usuario.nombre} {usuario.apellido_paterno}
                            </p>
                            {usuario.numero_credencial && (
                              <p className="text-xs font-mono text-text-muted">#{usuario.numero_credencial}</p>
                            )}
                          </Link>
                        ) : <span className="text-text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-text-muted hidden sm:table-cell">{p.fecha_pago}</td>
                      <td className="px-4 py-3">
                        <span className={`font-mono font-semibold ${p.anulado ? 'line-through text-text-muted' : 'text-text'}`}>
                          ${Number(p.monto).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted hidden md:table-cell">
                        {paquete?.nombre ?? '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-text-muted hidden lg:table-cell">
                        {p.numero_recibo ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-text-muted hidden lg:table-cell text-xs">
                        {metodo?.nombre ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {p.anulado ? (
                          <span className="text-xs text-vencido bg-red-50 border border-vencido/20 px-2 py-0.5 rounded-full">Anulado</span>
                        ) : (
                          <span className="text-xs text-vigente bg-green-50 border border-vigente/20 px-2 py-0.5 rounded-full">Válido</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-text-muted">No hay pagos registrados para este período.</p>
            <Link href="/pagos/nuevo" className="text-secondary hover:underline text-sm mt-2 inline-block">
              Registrar el primer pago del mes →
            </Link>
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
