import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generarCSV } from '@/lib/csv';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const estatusFiltro = searchParams.get('estatus') || 'todos';

  let query = supabase
    .from('usuarios')
    .select('numero_credencial, nombre, apellido_paterno, apellido_materno, celular, sexo, estatus, fecha_inscripcion, horarios(nombre), paquetes(nombre)')
    .order('apellido_paterno');

  if (estatusFiltro === 'todos') {
    query = query.neq('estatus', 'baja');
  } else {
    query = query.eq('estatus', estatusFiltro);
  }

  const { data } = await query;

  const usuarios = (data ?? []) as unknown as {
    numero_credencial: string | null;
    nombre: string;
    apellido_paterno: string;
    apellido_materno: string | null;
    celular: string | null;
    sexo: string | null;
    estatus: string;
    fecha_inscripcion: string;
    horarios: { nombre: string } | null;
    paquetes: { nombre: string } | null;
  }[];

  const csv = generarCSV(
    ['ID Credencial', 'Nombre', 'Apellido Paterno', 'Apellido Materno', 'Celular', 'Sexo', 'Estatus', 'Paquete', 'Horario', 'Fecha inscripción'],
    usuarios.map((u) => [
      u.numero_credencial ?? '',
      u.nombre,
      u.apellido_paterno,
      u.apellido_materno ?? '',
      u.celular ?? '',
      u.sexo ?? '',
      u.estatus,
      u.paquetes?.nombre ?? '',
      u.horarios?.nombre ?? '',
      u.fecha_inscripcion,
    ]),
  );

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="padron_${estatusFiltro}.csv"`,
    },
  });
}
