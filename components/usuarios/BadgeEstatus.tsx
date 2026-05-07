import type { EstatusUsuario } from '@/types/database';

const CONFIG: Record<EstatusUsuario, { label: string; classes: string }> = {
  activo:     { label: 'Vigente',    classes: 'bg-green-100 text-vigente  border-vigente/30' },
  vencido:    { label: 'Vencido',    classes: 'bg-red-100   text-vencido  border-vencido/30' },
  prorroga:   { label: 'Prórroga',   classes: 'bg-amber-100 text-prorroga border-prorroga/30' },
  baja:       { label: 'Baja',       classes: 'bg-gray-100  text-inactivo border-inactivo/30' },
  suspendido: { label: 'Suspendido', classes: 'bg-gray-100  text-inactivo border-inactivo/30' },
  pendiente:  { label: 'Pendiente',  classes: 'bg-blue-50   text-secondary border-secondary/30' },
};

interface Props {
  estatus: EstatusUsuario;
  size?: 'sm' | 'md';
}

export function BadgeEstatus({ estatus, size = 'md' }: Props) {
  const { label, classes } = CONFIG[estatus] ?? CONFIG.pendiente;
  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-sm px-3 py-1';

  return (
    <span className={`inline-flex items-center rounded-full border font-semibold ${classes} ${sizeClasses}`}>
      {label}
    </span>
  );
}
