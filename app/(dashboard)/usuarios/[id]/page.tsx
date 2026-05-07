import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { calcularEstatus } from '@/lib/vigencia';
import { AvatarUsuario } from '@/components/usuarios/AvatarUsuario';
import { BadgeEstatus } from '@/components/usuarios/BadgeEstatus';
import { FichaVigencia } from '@/components/vigencia/FichaVigencia';
import { PanelEdicion } from './PanelEdicion';
import { PanelEstatus } from './PanelEstatus';
import { PanelNotas } from '@/components/usuarios/PanelNotas';
import {
  Phone, Calendar, Clock, CreditCard,
  ShieldCheck, User, ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

export default async function FichaUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Datos del usuario con relaciones
  const { data: usuario } = await supabase
    .from('usuarios')
    .select('*, horarios(id, nombre), paquetes(id, nombre, codigo, precio_base)')
    .eq('id', id)
    .single();

  if (!usuario) notFound();

  // Vigencia calculada en tiempo real
  const vigencia = await calcularEstatus(id);

  // Historial de pagos
  const { data: pagos } = await supabase
    .from('pagos')
    .select('*, paquetes(nombre), metodos_pago(nombre)')
    .eq('usuario_id', id)
    .order('periodo_mes', { ascending: false })
    .limit(12);

  // Últimas asistencias
  const { data: asistencias } = await supabase
    .from('asistencias')
    .select('*')
    .eq('usuario_id', id)
    .order('fecha', { ascending: false })
    .limit(10);

  // Notas
  const { data: notas } = await supabase
    .from('notas')
    .select('*')
    .eq('usuario_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Catálogos para edición
  const [{ data: horarios }, { data: paquetes }] = await Promise.all([
    supabase.from('horarios').select('id, nombre').eq('activo', true).order('hora_inicio'),
    supabase.from('paquetes').select('id, nombre, codigo, precio_base, requiere_autorizacion').eq('activo', true).order('nombre'),
  ]);

  const nombreCompleto = `${usuario.nombre} ${usuario.apellido_paterno}${usuario.apellido_materno ? ` ${usuario.apellido_materno}` : ''}`;

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Breadcrumb */}
      <Link href="/usuarios" className="flex items-center gap-1.5 text-sm text-text-muted hover:text-primary transition-colors">
        <ArrowLeft size={14} />
        Volver a usuarios
      </Link>

      {/* Cabecera */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-start gap-5">
          <AvatarUsuario nombre={usuario.nombre} apellido={usuario.apellido_paterno} fotoUrl={usuario.foto_url} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h1 className="font-display text-2xl font-bold text-text">{nombreCompleto}</h1>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <BadgeEstatus estatus={usuario.estatus} />
                  {usuario.numero_credencial && (
                    <span className="font-mono text-sm bg-bg-card border border-accent/20 px-2.5 py-0.5 rounded text-secondary">
                      #{usuario.numero_credencial}
                    </span>
                  )}
                  {!usuario.numero_credencial && (
                    <span className="text-xs text-text-muted italic">Sin número de credencial</span>
                  )}
                </div>
              </div>
              {/* Acciones rápidas */}
              <div className="flex gap-2 flex-wrap">
                <Link
                  href={`/recepcion?q=${encodeURIComponent(usuario.numero_credencial ?? usuario.nombre)}`}
                  className="px-3 py-1.5 bg-bg-card text-secondary border border-accent/20 rounded-lg text-xs font-medium hover:bg-accent/10 transition-colors"
                >
                  Ir a Recepción
                </Link>
              </div>
            </div>

            {/* Datos clave */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <DatoRapido icon={<Clock size={14} />} label="Horario" value={usuario.horarios?.nombre ?? '—'} />
              <DatoRapido icon={<CreditCard size={14} />} label="Paquete" value={usuario.paquetes?.nombre ?? '—'} />
              <DatoRapido icon={<Phone size={14} />} label="Celular" value={usuario.celular ?? '—'} />
              <DatoRapido
                icon={<Calendar size={14} />}
                label="Inscripción"
                value={usuario.fecha_inscripcion
                  ? format(parseISO(usuario.fecha_inscripcion), 'd MMM yyyy', { locale: es })
                  : '—'}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Columna izquierda: datos y edición */}
        <div className="lg:col-span-2 space-y-5">
          {/* Panel de edición de datos */}
          <PanelEdicion
            usuario={usuario}
            horarios={horarios ?? []}
            paquetes={paquetes ?? []}
          />

          {/* Historial de pagos */}
          <section className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <h2 className="font-display font-semibold text-text flex items-center gap-2">
                <CreditCard size={16} className="text-secondary" /> Historial de pagos
              </h2>
              <Link href={`/pagos/nuevo?usuario=${id}`}
                className="text-xs text-secondary hover:underline">+ Registrar pago</Link>
            </div>
            {pagos && pagos.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-bg-card/60">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted">Período</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted hidden sm:table-cell">Monto</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted hidden md:table-cell">Recibo</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-text-muted">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pagos.map((p) => (
                    <tr key={p.id} className="border-t border-gray-50 hover:bg-bg-card/40">
                      <td className="px-4 py-3">
                        <p className="font-medium text-text">
                          {p.periodo_mes
                            ? format(parseISO(p.periodo_mes), 'MMMM yyyy', { locale: es })
                            : '—'}
                        </p>
                        <p className="text-xs text-text-muted">{p.fecha_pago}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="font-mono font-medium text-text">
                          ${Number(p.monto).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-muted hidden md:table-cell">
                        {p.numero_recibo ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {p.anulado ? (
                          <span className="text-xs text-vencido bg-red-50 border border-vencido/20 px-2 py-0.5 rounded-full">Anulado</span>
                        ) : (
                          <span className="text-xs text-vigente bg-green-50 border border-vigente/20 px-2 py-0.5 rounded-full">Válido</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="px-5 py-8 text-center text-text-muted text-sm">Sin pagos registrados</p>
            )}
          </section>

          {/* Asistencias recientes */}
          <section className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <h2 className="font-display font-semibold text-text flex items-center gap-2">
                <ShieldCheck size={16} className="text-vigente" /> Asistencias recientes
              </h2>
            </div>
            {asistencias && asistencias.length > 0 ? (
              <ul className="divide-y divide-gray-50">
                {asistencias.map((a) => (
                  <li key={a.id} className="flex items-center justify-between px-5 py-3 hover:bg-bg-card/40">
                    <div>
                      <p className="text-sm font-medium text-text">
                        {a.fecha
                          ? format(parseISO(a.fecha), "EEEE d 'de' MMMM", { locale: es })
                          : '—'}
                      </p>
                      <p className="text-xs text-text-muted">
                        {typeof a.hora_entrada === 'string'
                          ? a.hora_entrada.slice(0, 5)
                          : '—'} · {a.metodo_registro}
                        {a.es_duplicado_autorizado && ' · Entrada duplicada autorizada'}
                      </p>
                    </div>
                    <BadgeEstatus estatus={a.estatus_al_momento as import('@/types/database').EstatusUsuario} size="sm" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-text-muted text-sm">Sin asistencias registradas</p>
            )}
          </section>
        </div>

        {/* Columna derecha: vigencia, estatus, notas */}
        <div className="space-y-5">
          {/* Vigencia calculada en tiempo real */}
          <FichaVigencia vigencia={vigencia} />

          {/* Panel de cambio de estatus */}
          <PanelEstatus usuario={usuario} />

          {/* Datos de emergencia */}
          <section className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
            <h2 className="font-display font-semibold text-text flex items-center gap-2">
              <Phone size={16} className="text-vencido" /> Contacto de emergencia
            </h2>
            {usuario.contacto_emergencia_nombre ? (
              <div className="space-y-1 text-sm">
                <p className="font-medium text-text">{usuario.contacto_emergencia_nombre}</p>
                {usuario.contacto_emergencia_parentesco && (
                  <p className="text-text-muted">{usuario.contacto_emergencia_parentesco}</p>
                )}
                {usuario.contacto_emergencia_celular && (
                  <p className="text-secondary font-mono">{usuario.contacto_emergencia_celular}</p>
                )}
              </div>
            ) : (
              <p className="text-text-muted text-sm italic">No registrado</p>
            )}
            {usuario.servicio_medico && (
              <div className="pt-2 border-t border-gray-50">
                <p className="text-xs text-text-muted">Servicio médico</p>
                <p className="text-sm font-medium text-text">{usuario.servicio_medico}</p>
              </div>
            )}
          </section>

          {/* Notas */}
          <PanelNotas usuarioId={id} notas={notas ?? []} />

          {/* Observaciones del usuario */}
          {usuario.observaciones && (
            <section className="bg-bg-card border border-accent/20 rounded-xl p-4">
              <p className="text-xs font-semibold text-secondary mb-1.5 flex items-center gap-1">
                <User size={12} /> Observaciones
              </p>
              <p className="text-sm text-text">{usuario.observaciones}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function DatoRapido({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-bg-card rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-text-muted mb-1">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-sm font-medium text-text truncate">{value}</p>
    </div>
  );
}
