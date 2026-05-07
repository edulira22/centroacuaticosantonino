import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { format, startOfMonth } from 'date-fns';

export const metadata = { title: 'Sin pago — Reportes' };

interface SearchParams { mes?: string }

function mesActual() { return format(startOfMonth(new Date()), 'yyyy-MM'); }

export default async function ReporteSinPagoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const mes = params.mes || mesActual();
  const periodo_mes = `${mes}-01`;

  const supabase = await createClient();

  const [usuariosRes, pagosRes] = await Promise.all([
    supabase
      .from('usuarios')
      .select('id, numero_credencial, nombre, apellido_paterno, celular, estatus, horarios(nombre), paquetes(nombre)')
      .neq('estatus', 'baja')
      .neq('estatus', 'suspendido')
      .order('apellido_paterno'),
    supabase
      .from('pagos')
      .select('usuario_id')
      .eq('periodo_mes', periodo_mes)
      .eq('anulado', false),
  ]);

  const conPago = new Set((pagosRes.data ?? []).map((p) => p.usuario_id));

  const sinPago = ((usuariosRes.data ?? []) as unknown as {
    id: string;
    numero_credencial: string | null;
    nombre: string;
    apellido_paterno: string;
    celular: string | null;
    estatus: string;
    horarios: { nombre: string } | null;
    paquetes: { nombre: string } | null;
  }[]).filter((u) => !conPago.has(u.id));

  const csvParams = new URLSearchParams({ mes });

  return (
    <div className="space-y-5">
      <div>
        <Link href="/reportes" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors mb-3">
          <ArrowLeft size={14} /> Reportes
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-primary">Usuarios sin pago del mes</h1>
            <p className="text-text-muted text-sm mt-0.5">
              <span className="font-semibold text-vencido">{sinPago.length}</span> usuarios activos sin pago en{' '}
              <strong>{mes}</strong>
            </p>
          </div>
          <a
            href={`/api/reportes/sin-pago?${csvParams}`}
            className="flex items-center gap-2 px-4 py-2 bg-prorroga hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download size={15} /> Exportar CSV
          </a>
        </div>
      </div>

      {/* Filtro */}
      <form method="GET" className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-4 items-end">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-text-muted">Mes</label>
          <input type="month" name="mes" defaultValue={mes}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-secondary/40" />
        </div>
        <button type="submit"
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-secondary transition-colors">
          Filtrar
        </button>
      </form>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {sinPago.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-vigente font-semibold text-lg">¡Todos los usuarios tienen pago!</p>
            <p className="text-text-muted text-sm mt-1">No hay usuarios activos sin pago en este mes</p>
          </div>
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
              </tr>
            </thead>
            <tbody>
              {sinPago.map((u) => (
                <tr key={u.id} className="border-t border-gray-50 hover:bg-bg-card/40">
                  <td className="px-4 py-3 font-mono text-text-muted">
                    {u.numero_credencial ? `#${u.numero_credencial}` : '—'}
                  </td>
                  <td className="px-4 py-3 font-medium text-text">
                    <Link href={`/usuarios/${u.id}`} className="hover:text-secondary transition-colors">
                      {u.nombre} {u.apellido_paterno}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-muted hidden sm:table-cell">{u.celular ?? '—'}</td>
                  <td className="px-4 py-3 text-text-muted hidden md:table-cell">{u.horarios?.nombre ?? '—'}</td>
                  <td className="px-4 py-3 text-text-muted hidden md:table-cell">{u.paquetes?.nombre ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      u.estatus === 'activo'    ? 'bg-green-100 text-vigente'  :
                      u.estatus === 'vencido'   ? 'bg-red-100 text-vencido'    :
                      u.estatus === 'prorroga'  ? 'bg-amber-100 text-prorroga' :
                      'bg-blue-100 text-secondary'
                    }`}>
                      {u.estatus}
                    </span>
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
