import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { format, startOfMonth, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export const metadata = { title: 'Pagos — Reportes' };

interface SearchParams { mes?: string }

interface PagoRow {
  id: string;
  fecha_pago: string;
  monto: number;
  numero_recibo: string | null;
  usuarios: { nombre: string; apellido_paterno: string; numero_credencial: string | null } | null;
  paquetes: { nombre: string } | null;
  metodos_pago: { nombre: string } | null;
}

function mesActual() {
  return format(startOfMonth(new Date()), 'yyyy-MM');
}

export default async function ReportePagosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const mes = params.mes || mesActual();
  const periodo_mes = `${mes}-01`;

  const supabase = await createClient();

  const { data } = await supabase
    .from('pagos')
    .select('id, fecha_pago, monto, numero_recibo, usuarios(nombre, apellido_paterno, numero_credencial), paquetes(nombre), metodos_pago(nombre)')
    .eq('periodo_mes', periodo_mes)
    .eq('anulado', false)
    .order('fecha_pago', { ascending: false });

  const pagos = (data ?? []) as unknown as PagoRow[];
  const total = pagos.reduce((sum, p) => sum + Number(p.monto), 0);

  const csvParams = new URLSearchParams({ mes });

  return (
    <div className="space-y-5">
      <div>
        <Link href="/reportes" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors mb-3">
          <ArrowLeft size={14} /> Reportes
        </Link>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-primary">Pagos por mes</h1>
            <p className="text-text-muted text-sm mt-0.5">
              {pagos.length} pagos · Total: <strong className="text-vigente">${total.toFixed(2)}</strong>
            </p>
          </div>
          <a
            href={`/api/reportes/pagos?${csvParams}`}
            className="flex items-center gap-2 px-4 py-2 bg-vigente hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download size={15} /> Exportar CSV
          </a>
        </div>
      </div>

      {/* Filtro de mes */}
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
        {pagos.length === 0 ? (
          <p className="text-center text-text-muted py-12">No hay pagos registrados en este mes</p>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-primary text-white">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Usuario</th>
                  <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">ID Credencial</th>
                  <th className="text-left px-4 py-3 font-semibold">Paquete</th>
                  <th className="text-right px-4 py-3 font-semibold">Monto</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Recibo</th>
                  <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Método</th>
                  <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Fecha pago</th>
                </tr>
              </thead>
              <tbody>
                {pagos.map((p) => (
                  <tr key={p.id} className="border-t border-gray-50 hover:bg-bg-card/40">
                    <td className="px-4 py-3 font-medium text-text">
                      {p.usuarios?.nombre} {p.usuarios?.apellido_paterno}
                    </td>
                    <td className="px-4 py-3 font-mono text-text-muted hidden sm:table-cell">
                      {p.usuarios?.numero_credencial ? `#${p.usuarios.numero_credencial}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      {p.paquetes?.nombre ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-vigente">
                      ${Number(p.monto).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-mono text-text-muted hidden md:table-cell">
                      {p.numero_recibo ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-text-muted hidden md:table-cell">
                      {p.metodos_pago?.nombre ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-text-muted hidden lg:table-cell">
                      {format(parseISO(p.fecha_pago), 'd MMM yyyy', { locale: es })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-bg-card/60 border-t-2 border-gray-100">
                <tr>
                  <td colSpan={3} className="px-4 py-3 font-semibold text-text text-right">Total del mes:</td>
                  <td className="px-4 py-3 text-right font-bold text-vigente text-base">${total.toFixed(2)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
