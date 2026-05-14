import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_ROUTES = ['/login'];

// Rutas que requieren rol admin o superadmin
const RUTAS_ADMIN = ['/bajas', '/incidentes', '/reportes', '/bitacora', '/catalogos'];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: usar getUser() (no getSession()) para validar en servidor
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));

  // Sin sesión → redirigir a login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Con sesión en login → redirigir a recepción
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/recepcion';
    return NextResponse.redirect(url);
  }

  // Protección por rol: rutas admin bloqueadas para recepción
  if (user) {
    const rol = (user.user_metadata?.rol as string | undefined) ?? 'recepcion';
    const esRutaAdmin = RUTAS_ADMIN.some((r) => pathname.startsWith(r));

    if (esRutaAdmin && !['admin', 'superadmin'].includes(rol)) {
      const url = request.nextUrl.clone();
      url.pathname = '/recepcion';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|logo\\.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
