import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generarCSV } from '@/lib/csv';
import { format, startOfMonth } from 'date-fns';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const mes = searchParams.get('mes') || format(startOfMonth(new Date()), 'yyyy-MM');
  const periodo_mes = `${mes}-01`;

  const [usuariosRes, pagosRes] = await Promise.all([
    supabase
      .from('usuarios')
      .select('numero_credencial, nombre, apellido_paterno, celular, estatus, horarios(nombre), paquetes(nombre)')
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

  const csv = generarCSV(
    ['ID Credencial', 'Nombre', 'Apellido Paterno', 'Celular', 'Estatus', 'Paquete', 'Horario'],
    sinPago.map((u) => [
      u.numero_credencial ?? '',
      u.nombre,
      u.apellido_paterno,
      u.celular ?? '',
      u.estatus,
      u.paquetes?.nombre ?? '',
      u.horarios?.nombre ?? '',
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="sin_pago_${mes}.csv"`,
    },
  });
}
