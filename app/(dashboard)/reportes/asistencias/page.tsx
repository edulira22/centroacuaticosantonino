import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { format, startOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const metadata = { title: 'Asistencias — Reportes' };

interface SearchParams { desde?: string; hasta?: string; horario_id?: string }

interface AsistenciaRow {
  id: string;
  fecha: string;
  hora_entrada: string;
  estatus_al_momento: string;
  usuarios: { nombre: string; apellido_paterno: string; numero_credencial: string | null; horarios: { nombre: string } | null } | null;
}

export default async function ReporteAsistenciasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const hoy = format(new Date(), 'yyyy-MM-dd');
  const desde = params.desde || format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const hasta = params.hasta || hoy;
  const horario_id = params.horario_id || '';

  const supabase = await createClient();

  const [{ data: horarios }, asistenciasRes] = await Promise.all([
    supabase.from('horarios').select('id, nombre').eq('activo', true).order('nombre'),
    supabase
      .from('asistencias')
      .select('id, fecha, hora_entrada, estatus_al_momento, usuarios(nombre, apellido_paterno, numero_credencial, horarios(nombre))')
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .order('fecha', { ascending: false })
      .order('hora_entrada', { ascending: false })
      .limit(500),
  ]);

  let asistencias = (asistenciasRes.data ?? []) as unknown as AsistenciaRow[];
  if (horario_id) {
    asistencias = asistencias.filter(
      (a) => (a.usuarios as AsistenciaRow['usuarios'])?.horarios !== null &&
              (a.usuarios as AsistenciaRow['usuarios'])?.horarios?.nombre ===
              horarios?.find((h) => h.id === horario_id)?.nombre,
    );
  }

  const csvParams = new URLSearchParams({ desde, hasta, ...(horario_id ? { horario_id } : {}) });

  return (
    <div className="space-y-5">
      <div>
        <Link href="/reportes" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors mb-3">
          <ArrowLeft size={14} /> Reportes
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-primary">Asistencias por período</h1>
            <p className="text-text-muted text-sm mt-0.5">{asistencias.length} registros encontrados</p>
          </div>
          <a
            href={`/api/reportes/asistencias?${csvParams}`}
            className="flex items-center gap-2 px-4 py-2 bg-secondary hover:bg-primary text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download size={15} /> Exportar CSV
          </a>
        </div>
      </div>

      {/* Filtros */}
      <form method="GET" className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-text-muted">Desde</label>
          <input type="date" name="desde" defaultValue={desde}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40" />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-text-muted">Hasta</label>
          <input type="date" name="hasta" defaultValue={hasta}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40" />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-text-muted">Horario</label>
          <select name="horario_id" defaultValue={horario_id}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40">
            <option value="">Todos</option>
            {(horarios ?? []).map((h) => (
              <option key={h.id} value={h.id}>{h.nombre}</option>
            ))}
          </select>
        </div>
        <button type="submit"
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-secondary transition-colors">
          Filtrar
        </button>
      </form>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {asistencias.length === 0 ? (
          <p className="text-center text-text-muted py-12">No hay asistencias en el período seleccionado</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-primary text-white">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Fecha</th>
                  <th className="text-left px-4 py-3 font-semibold">Hora</th>
                  <th className="text-left px-4 py-3 font-semibold">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">ID Credencial</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Horario</th>
                  <th className="text-left px-4 py-3 font-semibold">Estatus</th>
                </tr>
              </thead>
              <tbody>
                {asistencias.map((a) => (
                  <tr key={a.id} className="border-t border-gray-50 hover:bg-bg-card/40">
                    <td className="px-4 py-3 text-text-muted">
                      {format(parseISO(a.fecha), 'd MMM yyyy', { locale: es })}
                    </td>
                    <td className="px-4 py-3 font-mono text-text">
                      {String(a.hora_entrada).slice(0, 5)}
                    </td>
                    <td className="px-4 py-3 font-medium text-text">
                      {a.usuarios?.nombre} {a.usuarios?.apellido_paterno}
                    </td>
                    <td className="px-4 py-3 font-mono text-text-muted hidden sm:table-cell">
                      {a.usuarios?.numero_credencial ? `#${a.usuarios.numero_credencial}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-text-muted hidden md:table-cell">
                      {a.usuarios?.horarios?.nombre ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        a.estatus_al_momento === 'activo'   ? 'bg-green-100 text-vigente'  :
                        a.estatus_al_momento === 'vencido'  ? 'bg-red-100 text-vencido'    :
                        a.estatus_al_momento === 'prorroga' ? 'bg-amber-100 text-prorroga' :
                        'bg-gray-100 text-text-muted'
                      }`}>
                        {a.estatus_al_momento}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {asistencias.length === 500 && (
              <p className="text-xs text-text-muted text-center py-3 border-t border-gray-50">
                Mostrando los primeros 500 registros — usa Exportar CSV para obtener todos
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
