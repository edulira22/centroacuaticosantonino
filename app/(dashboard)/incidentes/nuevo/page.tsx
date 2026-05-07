import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { FormularioIncidente } from './FormularioIncidente';

export const metadata = { title: 'Nuevo incidente — AquaControl' };

export default function NuevoIncidentePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Link
        href="/incidentes"
        className="flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors"
      >
        <ArrowLeft size={14} />
        Volver a enfermería
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold text-primary">Registrar incidente</h1>
        <p className="text-text-muted text-sm mt-0.5">
          Documenta el incidente médico o de seguridad ocurrido en las instalaciones.
        </p>
      </div>

      <FormularioIncidente />
    </div>
  );
}
