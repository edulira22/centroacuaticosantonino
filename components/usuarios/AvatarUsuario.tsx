import { getAvatarColor, getInitials } from '@/lib/avatar';
import Image from 'next/image';

interface Props {
  nombre: string;
  apellido: string;
  fotoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const SIZE = {
  sm: { container: 'w-8 h-8',   text: 'text-xs' },
  md: { container: 'w-10 h-10', text: 'text-sm' },
  lg: { container: 'w-14 h-14', text: 'text-lg' },
  xl: { container: 'w-20 h-20', text: 'text-2xl' },
};

export function AvatarUsuario({ nombre, apellido, fotoUrl, size = 'md' }: Props) {
  const { container, text } = SIZE[size];
  const color = getAvatarColor(`${nombre}${apellido}`);
  const initials = getInitials(nombre, apellido);

  if (fotoUrl) {
    return (
      <div className={`${container} rounded-full overflow-hidden shrink-0`}>
        <Image src={fotoUrl} alt={`${nombre} ${apellido}`} fill className="object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`${container} rounded-full flex items-center justify-center shrink-0 font-bold text-white ${text}`}
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}
