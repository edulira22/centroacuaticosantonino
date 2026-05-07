import { createClient } from '@/lib/supabase/server';
import { Stethoscope, PlusCircle } from 'lucide-react';
import { format, parseISO, startOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';

export const metadata = { title: 'Enfermería — AquaControl' };

const PAGE_SIZE = 20;

interface SearchParams { mes?: string; pagina?: string }

export default async function EnfermeriaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params   = await searchParams;
  const pagina   = Math.max(1, Number(params.pagina ?? '1'));
  const offset   = (pagina - 1) * PAGE_SIZE;
  const hoy      = new Date();
  const mesParam = params.mes ?? format(hoy, 'yyyy-MM');

  const supabase = await createClient();

  const { data: incidentes, count } = await supabase
    .from('incidentes_enfermeria')
    .select(
      'id, fecha, descripcion, accion_tomada, contacto_avisado, observaciones, created_at, usuarios(id, nombre, apellido_paterno, numero_credencial)',
      { count: 'exact' }
    )
    .gte('fecha', `${mesParam}-01`)
    .lte('fecha', `${mesParam}-31`)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const totalPaginas = Math.ceil((count ?? 0) / PAGE_SIZE);

  // Meses para el selector (últimos 12 + próximos 2)
  const meses: string[] = [];
  for (let i = -11; i <= 2; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
    meses.push(format(d, 'yyyy-MM'));
  }

  function buildHref(overrides: Partial<SearchParams>) {
    const p = new URLSearchParams();
    const merged = { mes: mesParam, pagina: String(pagina), ...overrides };
    if (merged.mes !== format(hoy, 'yyyy-MM')) p.set('mes', merged.mes);
    if (Number(merged.pagina) > 1) p.set('pagina', merged.pagina);
    const qs = p.toString();
    return `/incidentes${qs ? `?${qs}` : ''}`;
  }

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary flex items-center gap-2">
            <Stethoscope size={22} className="text-vencido" />
            Enfermería
          </h1>
          <p className="text-text-muted text-sm mt-0.5 capitalize">
            {format(parseISO(`${mesParam}-01`), 'MMMM yyyy', { locale: es })}
            {' · '}{count ?? 0} incidente{count !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/incidentes/nuevo"
          className="flex items-center gap-2 bg-primary hover:bg-secondary text-white px-4 py-2.5
                     rounded-lg text-sm font-semibold transition-colors"
        >
          <PlusCircle size={16} />
          Registrar incidente
        </Link>
      </div>

      {/* Selector de mes */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex gap-3 items-center flex-wrap">
        <span className="text-xs font-medium text-text-muted">Mes:</span>
        <div className="flex gap-2 flex-wrap">
          {meses.map((m) => (
            <Link
              key={m}
              href={buildHref({ mes: m, pagina: '1' })}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors capitalize
                ${m === mesParam
                  ? 'bg-primary text-white border-primary'
                  : 'border-gray-200 text-text-muted hover:border-secondary hover:text-secondary'}`}
            >
              {format(parseISO(`${m}-01`), 'MMM yy', { locale: es })}
            </Link>
          ))}
        </div>
      </div>

      {/* Lista de incidentes */}
      <div className="space-y-3">
        {incidentes && incidentes.length > 0 ? (
          incidentes.map((inc) => {
            const u = (inc.usuarios as unknown) as {
              id: string;
              nombre: string;
              apellido_paterno: string;
              numero_credencial: string | null;
            } | null;

            return (
              <div key={inc.id}
                className="bg-white rounded-xl border border-gray-100 p-5 hover:border-vencido/20 transition-colors">
                {/* Cabecera del incidente */}
                <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                  <div>
                    {u ? (
                      <Link href={`/usuarios/${u.id}`}
                        className="font-semibold text-text hover:text-secondary transition-colors">
                        {u.nombre} {u.apellido_paterno}
                      </Link>
                    ) : <span className="font-semibold text-text-muted">Usuario no encontrado</span>}
                    {u?.numero_credencial && (
                      <span className="ml-2 font-mono text-xs text-text-muted">#{u.numero_credencial}</span>
                    )}
                  </div>
                  <span className="text-xs text-text-muted whitespace-nowrap">
                    {inc.fecha
                      ? format(parseISO(inc.fecha as string), "d 'de' MMMM yyyy", { locale: es })
                      : '—'}
                  </span>
                </div>

                {/* Descripción */}
                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-semibold text-vencido uppercase tracking-wide mb-0.5">Descripción</p>
                    <p className="text-sm text-text">{inc.descripcion as string}</p>
                  </div>

                  {inc.accion_tomada && (
                    <div>
                      <p className="text-xs font-semibold text-secondary uppercase tracking-wide mb-0.5">Acción tomada</p>
                      <p className="text-sm text-text">{inc.accion_tomada as string}</p>
                    </div>
                  )}

                  {(inc.contacto_avisado || inc.observaciones) && (
                    <div className="flex flex-wrap gap-4 pt-1 border-t border-gray-50">
                      {inc.contacto_avisado && (
                        <div>
                          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-0.5">Contacto avisado</p>
                          <p className="text-sm text-text">{inc.contacto_avisado as string}</p>
                        </div>
                      )}
                      {inc.observaciones && (
                        <div>
                          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-0.5">Observaciones</p>
                          <p className="text-sm text-text">{inc.observaciones as string}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <p className="text-text-muted">No hay incidentes registrados en este período.</p>
            <Link href="/incidentes/nuevo"
              className="text-secondary hover:underline text-sm mt-2 inline-block">
              Registrar el primero →
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
