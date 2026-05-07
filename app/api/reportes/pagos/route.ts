import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generarCSV } from '@/lib/csv';
import { format, startOfMonth } from 'date-fns';

interface PagoRow {
  fecha_pago: string;
  monto: number;
  numero_recibo: string | null;
  usuarios: { nombre: string; apellido_paterno: string; numero_credencial: string | null } | null;
  paquetes: { nombre: string } | null;
  metodos_pago: { nombre: string } | null;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const mes = searchParams.get('mes') || format(startOfMonth(new Date()), 'yyyy-MM');
  const periodo_mes = `${mes}-01`;

  const { data } = await supabase
    .from('pagos')
    .select('fecha_pago, monto, numero_recibo, usuarios(nombre, apellido_paterno, numero_credencial), paquetes(nombre), metodos_pago(nombre)')
    .eq('periodo_mes', periodo_mes)
    .eq('anulado', false)
    .order('fecha_pago', { ascending: false });

  const pagos = (data ?? []) as unknown as PagoRow[];
  const total = pagos.reduce((s, p) => s + Number(p.monto), 0);

  const filas = pagos.map((p) => [
    p.usuarios?.nombre ?? '',
    p.usuarios?.apellido_paterno ?? '',
    p.usuarios?.numero_credencial ?? '',
    p.paquetes?.nombre ?? '',
    Number(p.monto).toFixed(2),
    p.numero_recibo ?? '',
    p.metodos_pago?.nombre ?? '',
    p.fecha_pago,
  ]);
  filas.push(['', '', '', 'TOTAL', total.toFixed(2), '', '', '']);

  const csv = generarCSV(
    ['Nombre', 'Apellido Paterno', 'ID Credencial', 'Paquete', 'Monto', 'Recibo', 'Método de pago', 'Fecha pago'],
    filas,
  );

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="pagos_${mes}.csv"`,
    },
  });
}
