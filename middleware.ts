import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Rutas que requieren rol admin o superadmin
const RUTAS_ADMIN = ['/bajas', '/incidentes', '/reportes', '/bitacora', '/catalogos'];

export async function middleware(request: NextRequest) {
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: usar getUser() (no getSession()) para validar en servidor
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Si no está autenticado y no va a /login → redirige al login
  if (!user && !pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si está autenticado y va a /login → redirige a recepción
  if (user && pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/recepcion', request.url));
  }

  // Protección por rol
  if (user) {
    const rol = (user.user_metadata?.rol as string | undefined) ?? 'recepcion';
    const esRutaAdmin = RUTAS_ADMIN.some((r) => pathname.startsWith(r));

    if (esRutaAdmin && !['admin', 'superadmin'].includes(rol)) {
      // Recepción intenta acceder a ruta de admin → manda a recepción
      return NextResponse.redirect(new URL('/recepcion', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Ejecuta el middleware en todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (imágenes optimizadas)
     * - favicon.ico, logo y otros assets públicos
     */
    '/((?!_next/static|_next/image|favicon\\.ico|logo\\.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
