import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { TablaUsuarios } from '@/components/usuarios/TablaUsuarios';
import { UserPlus, Search, SlidersHorizontal } from 'lucide-react';
import type { EstatusUsuario, UsuarioConRelaciones } from '@/types/database';

const PAGE_SIZE = 25;

interface SearchParams {
  q?: string;
  estatus?: string;
  horario?: string;
  pagina?: string;
}

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? '';
  const estatusFiltro = params.estatus ?? 'todos';
  const horarioFiltro = params.horario ?? '';
  const pagina = Number(params.pagina ?? '1');
  const offset = (pagina - 1) * PAGE_SIZE;

  const supabase = await createClient();

  // Consulta base con relaciones
  let q = supabase
    .from('usuarios')
    .select('*, horarios(id, nombre), paquetes(id, nombre, codigo)', { count: 'exact' })
    .order('apellido_paterno', { ascending: true })
    .order('nombre', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  // Filtro de texto
  if (query) {
    q = q.or(
      `nombre.ilike.%${query}%,apellido_paterno.ilike.%${query}%,apellido_materno.ilike.%${query}%,numero_credencial.ilike.%${query}%,celular.ilike.%${query}%`
    );
  }

  // Filtro de estatus
  if (estatusFiltro !== 'todos') {
    q = q.eq('estatus', estatusFiltro);
  }

  // Filtro de horario
  if (horarioFiltro) {
    q = q.eq('horario_id', horarioFiltro);
  }

  const { data: usuarios, count } = await q;

  // Catálogo de horarios para el filtro
  const { data: horarios } = await supabase
    .from('horarios')
    .select('id, nombre')
    .eq('activo', true)
    .order('hora_inicio');

  const totalPaginas = Math.ceil((count ?? 0) / PAGE_SIZE);

  const ESTATUS_OPTIONS = [
    { value: 'todos',      label: 'Todos' },
    { value: 'activo',     label: 'Vigentes' },
    { value: 'vencido',    label: 'Vencidos' },
    { value: 'prorroga',   label: 'Prórroga' },
    { value: 'pendiente',  label: 'Pendientes' },
    { value: 'baja',       label: 'Bajas' },
    { value: 'suspendido', label: 'Suspendidos' },
  ];

  function buildHref(overrides: Partial<SearchParams>) {
    const p = new URLSearchParams();
    const merged: SearchParams = {
      q: query || undefined,
      estatus: estatusFiltro !== 'todos' ? estatusFiltro : undefined,
      horario: horarioFiltro || undefined,
      pagina: pagina > 1 ? String(pagina) : undefined,
      ...overrides,
    };
    Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v); });
    const qs = p.toString();
    return `/usuarios${qs ? `?${qs}` : ''}`;
  }

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-primary">Usuarios</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {count ?? 0} usuario{count !== 1 ? 's' : ''} encontrado{count !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/usuarios/nuevo"
          className="flex items-center gap-2 bg-primary hover:bg-secondary text-white px-4 py-2.5
                     rounded-lg text-sm font-semibold transition-colors"
        >
          <UserPlus size={16} />
          Nuevo usuario
        </Link>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
        <form method="GET" action="/usuarios" className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              name="q"
              defaultValue={query}
              type="search"
              placeholder="Buscar por nombre, credencial o teléfono..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm
                         focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary"
            />
          </div>
          {estatusFiltro !== 'todos' && (
            <input type="hidden" name="estatus" value={estatusFiltro} />
          )}
          {horarioFiltro && (
            <input type="hidden" name="horario" value={horarioFiltro} />
          )}
          <button
            type="submit"
            className="px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-secondary transition-colors"
          >
            Buscar
          </button>
        </form>

        {/* Filtros de estatus */}
        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal size={14} className="text-text-muted shrink-0" />
          {ESTATUS_OPTIONS.map((opt) => (
            <Link
              key={opt.value}
              href={buildHref({ estatus: opt.value !== 'todos' ? opt.value : undefined, pagina: undefined })}
              className={[
                'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                estatusFiltro === opt.value
                  ? 'bg-primary text-white border-primary'
                  : 'border-gray-200 text-text-muted hover:border-secondary hover:text-secondary',
              ].join(' ')}
            >
              {opt.label}
            </Link>
          ))}

          {/* Filtro de horario */}
          {horarios && horarios.length > 0 && (
            <select
              name="horario_select"
              defaultValue={horarioFiltro}
              onChange={undefined}
              className="px-3 py-1 border border-gray-200 rounded-full text-xs text-text-muted
                         focus:outline-none focus:border-secondary cursor-pointer"
              data-href-base={buildHref({ horario: undefined })}
            >
              <option value="">Todos los horarios</option>
              {horarios.map((h) => (
                <option key={h.id} value={h.id}>{h.nombre}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Tabla */}
      <TablaUsuarios usuarios={(usuarios ?? []) as UsuarioConRelaciones[]} />

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">
            Página {pagina} de {totalPaginas}
          </p>
          <div className="flex gap-2">
            {pagina > 1 && (
              <Link
                href={buildHref({ pagina: String(pagina - 1) })}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-bg-card transition-colors"
              >
                Anterior
              </Link>
            )}
            {pagina < totalPaginas && (
              <Link
                href={buildHref({ pagina: String(pagina + 1) })}
                className="px-3 py-1.5 bg-primary text-white rounded-lg text-sm hover:bg-secondary transition-colors"
              >
                Siguiente
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
