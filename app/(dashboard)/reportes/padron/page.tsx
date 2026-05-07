import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const metadata = { title: 'Padrón — Reportes' };

interface SearchParams { estatus?: string }

const ESTATUS_OPTS = [
  { value: 'todos',     label: 'Todos (excepto bajas)' },
  { value: 'activo',    label: 'Activos' },
  { value: 'vencido',   label: 'Vencidos' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'prorroga',  label: 'Prórroga' },
  { value: 'baja',      label: 'Bajas' },
];

export default async function ReportePadronPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const estatusFiltro = params.estatus || 'todos';

  const supabase = await createClient();

  let query = supabase
    .from('usuarios')
    .select('id, numero_credencial, nombre, apellido_paterno, apellido_materno, celular, sexo, estatus, fecha_inscripcion, horarios(nombre), paquetes(nombre)')
    .order('apellido_paterno');

  if (estatusFiltro === 'todos') {
    query = query.neq('estatus', 'baja');
  } else {
    query = query.eq('estatus', estatusFiltro);
  }

  const { data } = await query;

  const usuarios = (data ?? []) as unknown as {
    id: string;
    numero_credencial: string | null;
    nombre: string;
    apellido_paterno: string;
    apellido_materno: string | null;
    celular: string | null;
    sexo: string | null;
    estatus: string;
    fecha_inscripcion: string;
    horarios: { nombre: string } | null;
    paquetes: { nombre: string } | null;
  }[];

  const csvParams = new URLSearchParams({ estatus: estatusFiltro });

  return (
    <div className="space-y-5">
      <div>
        <Link href="/reportes" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors mb-3">
          <ArrowLeft size={14} /> Reportes
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-primary">Padrón de usuarios</h1>
            <p className="text-text-muted text-sm mt-0.5">{usuarios.length} usuarios</p>
          </div>
          <a
            href={`/api/reportes/padron?${csvParams}`}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download size={15} /> Exportar CSV
          </a>
        </div>
      </div>

      {/* Filtro */}
      <form method="GET" className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-text-muted">Estatus</label>
          <select name="estatus" defaultValue={estatusFiltro}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40">
            {ESTATUS_OPTS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
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
        {usuarios.length === 0 ? (
          <p className="text-center text-text-muted py-12">No hay usuarios con ese estatus</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-primary text-white">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">ID Cred.</th>
                <th className="text-left px-4 py-3 font-semibold">Nombre</th>
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Celular</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Horario</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Paquete</th>
                <th className="text-left px-4 py-3 font-semibold">Estatus</th>
                <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Inscripción</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} className="border-t border-gray-50 hover:bg-bg-card/40">
                  <td className="px-4 py-3 font-mono text-text-muted">
                    {u.numero_credencial ? `#${u.numero_credencial}` : '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-text">
                    {u.nombre} {u.apellido_paterno}
                    {u.apellido_materno ? ` ${u.apellido_materno}` : ''}
                  </td>
                  <td className="px-4 py-3 text-text-muted hidden sm:table-cell">{u.celular ?? '—'}</td>
                  <td className="px-4 py-3 text-text-muted hidden md:table-cell">{u.horarios?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-text-muted hidden md:table-cell">{u.paquetes?.nombre ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.estatus === 'activo'     ? 'bg-green-100 text-vigente'   :
                      u.estatus === 'vencido'    ? 'bg-red-100 text-vencido'     :
                      u.estatus === 'prorroga'   ? 'bg-amber-100 text-prorroga'  :
                      u.estatus === 'pendiente'  ? 'bg-blue-100 text-secondary'  :
                      'bg-gray-100 text-inactivo'
                    }`}>
                      {u.estatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted hidden lg:table-cell">
                    {u.fecha_inscripcion
                      ? format(parseISO(u.fecha_inscripcion), 'd MMM yyyy', { locale: es })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
