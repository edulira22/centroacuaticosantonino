import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { AvatarUsuario } from './AvatarUsuario';
import { BadgeEstatus } from './BadgeEstatus';
import type { UsuarioConRelaciones } from '@/types/database';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface Props {
  usuarios: UsuarioConRelaciones[];
}

export function TablaUsuarios({ usuarios }: Props) {
  if (usuarios.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
        <p className="text-text-muted">No se encontraron usuarios con esos criterios.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-primary text-white">
              <th className="text-left px-4 py-3 font-semibold">Usuario</th>
              <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Credencial</th>
              <th className="text-left px-4 py-3 font-semibold hidden md:table-cell">Horario</th>
              <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell">Paquete</th>
              <th className="text-left px-4 py-3 font-semibold">Estatus</th>
              <th className="text-left px-4 py-3 font-semibold hidden xl:table-cell">Inscripción</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u, i) => (
              <tr
                key={u.id}
                className={`border-t border-gray-50 hover:bg-bg-card transition-colors ${
                  i % 2 === 1 ? 'bg-bg-card/40' : ''
                }`}
              >
                {/* Nombre + Avatar */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <AvatarUsuario
                      nombre={u.nombre}
                      apellido={u.apellido_paterno}
                      fotoUrl={u.foto_url}
                      size="sm"
                    />
                    <div>
                      <p className="font-medium text-text leading-tight">
                        {u.nombre} {u.apellido_paterno}
                        {u.apellido_materno ? ` ${u.apellido_materno}` : ''}
                      </p>
                      {u.celular && (
                        <p className="text-xs text-text-muted">{u.celular}</p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Credencial */}
                <td className="px-4 py-3 hidden sm:table-cell">
                  {u.numero_credencial ? (
                    <span className="font-mono text-xs bg-bg-card px-2 py-0.5 rounded border border-accent/20 text-secondary">
                      {u.numero_credencial}
                    </span>
                  ) : (
                    <span className="text-text-muted text-xs italic">Sin asignar</span>
                  )}
                </td>

                {/* Horario */}
                <td className="px-4 py-3 text-text-muted hidden md:table-cell">
                  {u.horarios?.nombre ?? '—'}
                </td>

                {/* Paquete */}
                <td className="px-4 py-3 text-text-muted hidden lg:table-cell">
                  {u.paquetes?.nombre ?? '—'}
                </td>

                {/* Estatus */}
                <td className="px-4 py-3">
                  <BadgeEstatus estatus={u.estatus} size="sm" />
                </td>

                {/* Fecha inscripción */}
                <td className="px-4 py-3 text-text-muted hidden xl:table-cell">
                  {u.fecha_inscripcion
                    ? format(parseISO(u.fecha_inscripcion), 'd MMM yyyy', { locale: es })
                    : '—'}
                </td>

                {/* Acción */}
                <td className="px-4 py-3">
                  <Link
                    href={`/usuarios/${u.id}`}
                    className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-bg-card text-text-muted hover:text-primary transition-colors"
                  >
                    <ChevronRight size={16} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
