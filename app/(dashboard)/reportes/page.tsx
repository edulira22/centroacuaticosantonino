import Link from 'next/link';
import { Calendar, CreditCard, Users, AlertTriangle } from 'lucide-react';

const REPORTES = [
  {
    href: '/reportes/asistencias',
    Icon: Calendar,
    titulo: 'Asistencias por período',
    desc: 'Entradas registradas en un rango de fechas, filtrable por horario',
    color: 'bg-blue-50 text-secondary',
    hover: 'group-hover:bg-secondary group-hover:text-white',
    border: 'group-hover:border-secondary',
  },
  {
    href: '/reportes/pagos',
    Icon: CreditCard,
    titulo: 'Pagos por mes',
    desc: 'Ingresos y recibos de mensualidades de un mes específico',
    color: 'bg-green-50 text-vigente',
    hover: 'group-hover:bg-vigente group-hover:text-white',
    border: 'group-hover:border-vigente',
  },
  {
    href: '/reportes/padron',
    Icon: Users,
    titulo: 'Padrón de usuarios',
    desc: 'Lista completa de usuarios con estatus, paquete y horario',
    color: 'bg-purple-50 text-purple-600',
    hover: 'group-hover:bg-purple-600 group-hover:text-white',
    border: 'group-hover:border-purple-400',
  },
  {
    href: '/reportes/sin-pago',
    Icon: AlertTriangle,
    titulo: 'Usuarios sin pago del mes',
    desc: 'Usuarios activos que no tienen pago registrado en el mes seleccionado',
    color: 'bg-amber-50 text-prorroga',
    hover: 'group-hover:bg-prorroga group-hover:text-white',
    border: 'group-hover:border-prorroga',
  },
];

export const metadata = { title: 'Reportes — AquaControl' };

export default function ReportesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-primary">Reportes</h1>
        <p className="text-text-muted text-sm mt-1">
          Consulta y exporta datos del centro en formato CSV (compatible con Excel)
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {REPORTES.map(({ href, Icon, titulo, desc, color, hover, border }) => (
          <Link
            key={href}
            href={href}
            className={`group bg-white border-2 border-gray-100 ${border} rounded-2xl p-6
                        hover:shadow-md transition-all duration-150 active:scale-[0.99]`}
          >
            <div className="flex items-start gap-4">
              <span className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${color} ${hover}`}>
                <Icon size={24} />
              </span>
              <div>
                <p className="font-display font-bold text-text group-hover:text-primary transition-colors">
                  {titulo}
                </p>
                <p className="text-sm text-text-muted mt-1">{desc}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
