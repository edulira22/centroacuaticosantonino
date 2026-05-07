import { createClient } from '@/lib/supabase/server';
import { FormularioPago } from './FormularioPago';

interface SearchParams {
  usuario?: string;   // pre-llenar usuario desde ficha
}

export default async function NuevoPagoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: paquetes }, { data: metodos }, { data: usuarioPrellenado }] = await Promise.all([
    supabase.from('paquetes').select('id, nombre, codigo, precio_base, requiere_autorizacion').eq('activo', true).order('nombre'),
    supabase.from('metodos_pago').select('id, nombre').eq('activo', true),
    params.usuario
      ? supabase
          .from('usuarios')
          .select('id, nombre, apellido_paterno, numero_credencial, paquete_id')
          .eq('id', params.usuario)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-primary">Registrar pago</h1>
        <p className="text-text-muted text-sm mt-0.5">
          Registra el pago de mensualidad de un usuario
        </p>
      </div>
      <FormularioPago
        paquetes={paquetes ?? []}
        metodos={metodos ?? []}
        usuarioPrellenado={usuarioPrellenado ?? null}
      />
    </div>
  );
}
