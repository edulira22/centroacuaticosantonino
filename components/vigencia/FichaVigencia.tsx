import type { EstatusVigencia } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';

interface Props {
  vigencia: EstatusVigencia;
  size?: 'compact' | 'full';
}

const CONFIG = {
  activo: {
    bg:     'bg-green-50  border-vigente/30',
    text:   'text-vigente',
    icon:   <CheckCircle2 size={20} />,
    titulo: 'ACCESO PERMITIDO',
  },
  vencido: {
    bg:     'bg-red-50    border-vencido/30',
    text:   'text-vencido',
    icon:   <XCircle size={20} />,
    titulo: 'PAGO VENCIDO',
  },
  prorroga: {
    bg:     'bg-amber-50  border-prorroga/30',
    text:   'text-prorroga',
    icon:   <AlertTriangle size={20} />,
    titulo: 'PRÓRROGA ACTIVA',
  },
  pendiente: {
    bg:     'bg-blue-50   border-secondary/30',
    text:   'text-secondary',
    icon:   <Clock size={20} />,
    titulo: 'PENDIENTE',
  },
  baja: {
    bg:     'bg-gray-50   border-inactivo/30',
    text:   'text-inactivo',
    icon:   <XCircle size={20} />,
    titulo: 'USUARIO INACTIVO',
  },
  suspendido: {
    bg:     'bg-gray-50   border-inactivo/30',
    text:   'text-inactivo',
    icon:   <XCircle size={20} />,
    titulo: 'SUSPENDIDO',
  },
};

export function FichaVigencia({ vigencia, size = 'full' }: Props) {
  const cfg = CONFIG[vigencia.estatus] ?? CONFIG.pendiente;

  if (size === 'compact') {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${cfg.bg} ${cfg.text}`}>
        {cfg.icon}
        <span className="font-bold text-sm">{cfg.titulo}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border-2 p-5 space-y-3 ${cfg.bg}`}>
      {/* Estatus principal */}
      <div className={`flex items-center gap-2 ${cfg.text}`}>
        {cfg.icon}
        <span className="font-display font-bold text-xl tracking-tight">{cfg.titulo}</span>
      </div>

      {/* Detalles de vigencia */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {vigencia.vigente_hasta && (
          <div>
            <p className="text-text-muted text-xs">Vigente hasta</p>
            <p className="font-semibold text-text">
              {format(parseISO(vigencia.vigente_hasta), "d 'de' MMMM yyyy", { locale: es })}
            </p>
          </div>
        )}

        {vigencia.estatus === 'vencido' && vigencia.dias_vencido > 0 && (
          <div>
            <p className="text-text-muted text-xs">Días vencido</p>
            <p className={`font-bold ${cfg.text}`}>{vigencia.dias_vencido} días</p>
          </div>
        )}

        {vigencia.ultimo_pago && (
          <div>
            <p className="text-text-muted text-xs">Último pago</p>
            <p className="font-semibold text-text">
              {format(parseISO(vigencia.ultimo_pago.fecha), "d MMM yyyy", { locale: es })}
            </p>
          </div>
        )}

        {vigencia.ultimo_pago?.monto !== undefined && (
          <div>
            <p className="text-text-muted text-xs">Monto pagado</p>
            <p className="font-semibold text-text font-mono">
              ${Number(vigencia.ultimo_pago.monto).toFixed(2)}
            </p>
          </div>
        )}

        {vigencia.ultimo_pago?.numero_recibo && (
          <div>
            <p className="text-text-muted text-xs">No. recibo</p>
            <p className="font-mono text-text">{vigencia.ultimo_pago.numero_recibo}</p>
          </div>
        )}
      </div>
    </div>
  );
}
