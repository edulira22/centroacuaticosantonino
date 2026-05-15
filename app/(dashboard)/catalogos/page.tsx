import { createClient } from '@/lib/supabase/server';
import { SeccionParametros } from './SeccionParametros';
import { SeccionPaquetes } from './SeccionPaquetes';
import { SeccionHorarios } from './SeccionHorarios';

export const dynamic = 'force-dynamic';

export default async function CatálogosPage() {
  const supabase = await createClient();

  const [
    { data: parametros },
    { data: paquetes },
    { data: horarios },
  ] = await Promise.all([
    supabase
      .from('parametros_sistema')
      .select('id, clave, valor, tipo, descripcion, es_sistema')
      .neq('clave', 'ultimo_recalculo_estatus') // parámetro interno, no visible para el admin
      .order('es_sistema', { ascending: false })
      .order('clave'),
    supabase
      .from('paquetes')
      .select('id, nombre, codigo, precio_base, requiere_autorizacion, activo')
      .order('activo', { ascending: false })
      .order('nombre'),
    supabase
      .from('horarios')
      .select('id, nombre, hora_inicio, hora_fin, activo')
      .order('hora_inicio'),
  ]);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="font-display text-2xl font-bold text-primary">Catálogos</h1>
        <p className="text-text-muted text-sm mt-1">
          Configuración de parámetros, paquetes y horarios del sistema
        </p>
      </div>

      {/* Parámetros del sistema */}
      <SeccionParametros parametros={parametros ?? []} />

      {/* Paquetes de membresía */}
      <SeccionPaquetes paquetes={paquetes ?? []} />

      {/* Horarios */}
      <SeccionHorarios horarios={horarios ?? []} />
    </div>
  );
}
