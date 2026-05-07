import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generarCSV } from '@/lib/csv';
import { format, startOfMonth } from 'date-fns';

interface AsistenciaRow {
  fecha: string;
  hora_entrada: string;
  estatus_al_momento: string;
  usuarios: { nombre: string; apellido_paterno: string; numero_credencial: string | null; horarios: { nombre: string } | null } | null;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const desde = searchParams.get('desde') || format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const hasta = searchParams.get('hasta') || format(new Date(), 'yyyy-MM-dd');
  const horario_id = searchParams.get('horario_id') || '';

  let query = supabase
    .from('asistencias')
    .select('fecha, hora_entrada, estatus_al_momento, usuarios(nombre, apellido_paterno, numero_credencial, horarios(nombre))')
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('fecha', { ascending: false });

  const { data } = await query;
  let rows = (data ?? []) as unknown as AsistenciaRow[];

  if (horario_id) {
    const { data: horario } = await supabase.from('horarios').select('nombre').eq('id', horario_id).single();
    if (horario) {
      rows = rows.filter((r) => r.usuarios?.horarios?.nombre === horario.nombre);
    }
  }

  const csv = generarCSV(
    ['Fecha', 'Hora', 'Nombre', 'Apellido Paterno', 'ID Credencial', 'Horario', 'Estatus al momento'],
    rows.map((r) => [
      r.fecha,
      String(r.hora_entrada).slice(0, 5),
      r.usuarios?.nombre ?? '',
      r.usuarios?.apellido_paterno ?? '',
      r.usuarios?.numero_credencial ?? '',
      r.usuarios?.horarios?.nombre ?? '',
      r.estatus_al_momento,
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="asistencias_${desde}_${hasta}.csv"`,
    },
  });
}
