'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  UserMinus,
  Stethoscope,
  BarChart2,
  ScrollText,
  Settings,
  LogOut,
  Menu,
  Dumbbell,
  MonitorPlay,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  rolesPermitidos?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { href: '/recepcion', label: 'Recepción',  icon: <Dumbbell size={20} /> },
  { href: '/',          label: 'Dashboard',  icon: <LayoutDashboard size={20} /> },
  { href: '/usuarios',  label: 'Usuarios',   icon: <Users size={20} /> },
  { href: '/pagos',     label: 'Pagos',      icon: <CreditCard size={20} /> },
  {
    href: '/bajas',
    label: 'Bajas',
    icon: <UserMinus size={20} />,
    rolesPermitidos: ['admin', 'superadmin'],
  },
  {
    href: '/incidentes',
    label: 'Enfermería',
    icon: <Stethoscope size={20} />,
    rolesPermitidos: ['admin', 'superadmin'],
  },
  {
    href: '/reportes',
    label: 'Reportes',
    icon: <BarChart2 size={20} />,
    rolesPermitidos: ['admin', 'superadmin'],
  },
  {
    href: '/bitacora',
    label: 'Bitácora',
    icon: <ScrollText size={20} />,
    rolesPermitidos: ['admin', 'superadmin'],
  },
  {
    href: '/catalogos',
    label: 'Catálogos',
    icon: <Settings size={20} />,
    rolesPermitidos: ['admin', 'superadmin'],
  },
];

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  const isRecepcion = item.href === '/recepcion';

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={[
        'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
        isRecepcion && !active
          ? 'bg-accent/20 text-accent hover:bg-accent/30 border border-accent/30'
          : '',
        active
          ? 'bg-white/20 text-white shadow-sm'
          : !isRecepcion
          ? 'text-blue-100/80 hover:bg-white/10 hover:text-white'
          : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className={active ? 'text-accent' : ''}>{item.icon}</span>
      <span>{item.label}</span>
      {isRecepcion && !active && (
        <span className="ml-auto text-xs bg-accent/30 text-accent px-1.5 py-0.5 rounded-full">
          Principal
        </span>
      )}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [rol, setRol] = useState<string>('recepcion');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        setRol(
          (data.user.user_metadata?.rol as string | undefined) ?? 'recepcion'
        );
      }
    });
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  const itemsVisibles = NAV_ITEMS.filter(
    (item) =>
      !item.rolesPermitidos || item.rolesPermitidos.includes(rol)
  );

  const Sidebar = (
    <aside className="flex flex-col h-full bg-primary w-64 shrink-0">
      {/* Logo */}
      <div className="px-4 pt-4 pb-2">
        <div className="bg-white rounded-xl px-3 py-2 flex items-center justify-center">
          <Image
            src="/logo.svg"
            alt="Centro Acuático Chihuahua"
            width={200}
            height={110}
            className="h-16 w-auto"
            priority
          />
        </div>
      </div>

      {/* Separador decorativo (onda) */}
      <div className="px-6 mb-2">
        <div className="h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {itemsVisibles.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href)
            }
            onClick={() => setSidebarOpen(false)}
          />
        ))}

        {/* Monitor — siempre visible, abre en nueva pestaña */}
        <a
          href="/monitor"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-blue-100/80 hover:bg-white/10 hover:text-white transition-all duration-150"
        >
          <MonitorPlay size={20} />
          <span>Monitor</span>
        </a>
      </nav>

      {/* Usuario autenticado */}
      <div className="px-3 pb-4 pt-2 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">
              {user?.email?.charAt(0).toUpperCase() ?? '?'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs font-medium truncate">
              {user?.email ?? 'Cargando...'}
            </p>
            <p className="text-blue-200/60 text-xs capitalize">{rol}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-blue-100/80
                     hover:bg-white/10 hover:text-white transition-all duration-150"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-bg-app">
      {/* Sidebar desktop */}
      <div className="hidden md:flex">{Sidebar}</div>

      {/* Sidebar móvil — overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative flex h-full">{Sidebar}</div>
        </div>
      )}

      {/* Área de contenido */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-4 md:px-6 h-14 flex items-center justify-between shrink-0 shadow-sm">
          {/* Botón hamburguesa móvil */}
          <button
            className="md:hidden text-text-muted hover:text-text transition-colors p-1"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={22} />
          </button>

          {/* Título de módulo activo */}
          <span className="text-sm font-medium text-text-muted hidden md:block">
            {itemsVisibles.find((i) =>
              i.href === '/'
                ? pathname === '/'
                : pathname.startsWith(i.href)
            )?.label ?? 'Dashboard'}
          </span>

          {/* Badge de rol */}
          <span
            className={[
              'text-xs px-2.5 py-1 rounded-full font-semibold capitalize',
              rol === 'superadmin'
                ? 'bg-purple-100 text-purple-700'
                : rol === 'admin'
                ? 'bg-blue-100 text-primary'
                : 'bg-bg-card text-secondary',
            ].join(' ')}
          >
            {rol}
          </span>
        </header>

        {/* Contenido principal */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
