import { createClient } from '@/lib/supabase/server';
import { UserMinus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

export const metadata = { title: 'Bajas — AquaControl' };

const PAGE_SIZE = 25;

interface SearchParams { q?: string; pagina?: string }

export default async function BajasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q      = params.q?.trim() ?? '';
  const pagina = Math.max(1, Number(params.pagina ?? '1'));
  const offset = (pagina - 1) * PAGE_SIZE;

  const supabase = await createClient();

  // Bajas con datos del usuario
  const { data: bajas, count } = await supabase
    .from('bajas')
    .select(
      'id, fecha_baja, motivo, observaciones, created_at, usuarios(id, nombre, apellido_paterno, apellido_materno, numero_credencial, estatus)',
      { count: 'exact' }
    )
    .order('fecha_baja', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  // Filtro por nombre/credencial (post-fetch ya que Supabase no filtra en join sin RPC)
  const filas = (bajas ?? []).filter((b) => {
    if (!q) return true;
    const u = (b.usuarios as unknown) as {
      nombre: string; apellido_paterno: string; numero_credencial: string | null
    } | null;
    if (!u) return false;
    const texto = `${u.nombre} ${u.apellido_paterno} ${u.numero_credencial ?? ''}`.toLowerCase();
    return texto.includes(q.toLowerCase());
  });

  const totalPaginas = Math.ceil((count ?? 0) / PAGE_SIZE);

  function buildHref(overrides: Partial<SearchParams>) {
    const p = new URLSearchParams();
    if (q && !('q' in overrides)) p.set('q', q);
    if (overrides.q) p.set('q', overrides.q);
    if (Number(overrides.pagina ?? pagina) > 1) p.set('pagina', overrides.pagina ?? String(pagina));
    const qs = p.toString();
    return `/bajas${qs ? `?${qs}` : ''}`;
  }

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary flex items-center gap-2">
            <UserMinus size={22} className="text-vencido" />
            Bajas
          </h1>
          <p className="text-text-muted text-sm mt-0.5">
            Historial de bajas de usuarios · {count ?? 0} registro{count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Buscador */}
      <form method="GET" action="/bajas" className="bg-white rounded-xl border border-gray-100 p-4 flex gap-3">
        <input
          name="q"
          defaultValue={q}
          type="search"
          placeholder="Buscar por nombre o número de credencial..."
          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary"
        />
        <button type="submit"
          className="px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-secondary transition-colors">
          Buscar
        </button>
        {q && (
          <Link href="/bajas"
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-text-muted hover:bg-bg-card transition-colors">
            Limpiar
          </Link>
        )}
      </form>

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {filas.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary text-white">
                  <th className="text-left px-4 py-3 font-semibold">Usuario</th>
                  <th className="text-left px-4 py-3 font-semibold">Fecha de baja</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Motivo</th>
                  <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Observaciones</th>
                  <th className="text-left px-4 py-3 font-semibold">Estatus actual</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((b, i) => {
                  const u = (b.usuarios as unknown) as {
                    id: string;
                    nombre: string;
                    apellido_paterno: string;
                    apellido_materno: string | null;
                    numero_credencial: string | null;
                    estatus: string;
                  } | null;

                  const reactivado = u?.estatus === 'activo' || u?.estatus === 'prorroga';

                  return (
                    <tr key={b.id}
                      className={`border-t border-gray-50 hover:bg-bg-card/40 ${i % 2 === 1 ? 'bg-bg-card/20' : ''}`}>
                      <td className="px-4 py-3">
                        {u ? (
                          <Link href={`/usuarios/${u.id}`} className="hover:text-secondary transition-colors">
                            <p className="font-medium text-text">
                              {u.nombre} {u.apellido_paterno}
                              {u.apellido_materno ? ` ${u.apellido_materno}` : ''}
                            </p>
                            {u.numero_credencial && (
                              <p className="text-xs font-mono text-text-muted">#{u.numero_credencial}</p>
                            )}
                          </Link>
                        ) : <span className="text-text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-text-muted whitespace-nowrap">
                        {b.fecha_baja
                          ? format(parseISO(b.fecha_baja as string), "d 'de' MMMM yyyy", { locale: es })
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-text hidden md:table-cell max-w-xs">
                        <p className="truncate" title={b.motivo as string}>{b.motivo as string ?? '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-text-muted text-xs hidden lg:table-cell max-w-xs">
                        <p className="truncate" title={(b.observaciones as string) ?? ''}>
                          {b.observaciones as string ?? '—'}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        {reactivado ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-vigente border border-vigente/20 font-medium">
                            Reactivado
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-vencido border border-vencido/20 font-medium capitalize">
                            {u?.estatus ?? 'baja'}
                          </span>
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
            <p className="text-text-muted">
              {q ? `Sin resultados para "${q}".` : 'No hay bajas registradas.'}
            </p>
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
