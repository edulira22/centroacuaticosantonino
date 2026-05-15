import { necesitaRecalculo } from '@/lib/recalculo';
import ClientLayout from './_ClientLayout';

/**
 * Layout servidor del dashboard.
 * Verifica si los estatus necesitan recalcularse antes de renderizar.
 * Si es así, pasa recalculando=true al layout cliente, que muestra
 * una pantalla de carga mientras llama al API y refresca la página.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const recalculando = await necesitaRecalculo();
  return <ClientLayout recalculando={recalculando}>{children}</ClientLayout>;
}
