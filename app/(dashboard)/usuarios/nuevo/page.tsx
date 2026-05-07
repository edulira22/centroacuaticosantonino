import { createClient } from '@/lib/supabase/server';
import { FormularioAltaUsuario } from './FormularioAltaUsuario';

export default async function NuevoUsuarioPage() {
  const supabase = await createClient();

  const [{ data: horarios }, { data: paquetes }] = await Promise.all([
    supabase
      .from('horarios')
      .select('id, nombre')
      .eq('activo', true)
      .order('hora_inicio'),
    supabase
      .from('paquetes')
      .select('id, nombre, codigo, precio_base, requiere_autorizacion')
      .eq('activo', true)
      .order('nombre'),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-primary">Nuevo usuario</h1>
        <p className="text-text-muted text-sm mt-0.5">
          Alta de inscrito al Centro Acuático Chihuahua
        </p>
      </div>
      <FormularioAltaUsuario
        horarios={horarios ?? []}
        paquetes={paquetes ?? []}
      />
    </div>
  );
}
