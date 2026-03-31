import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Proxy de Control de Acceso y Sesión (RBAC) - Actualizado para Next.js 16
 * Proyecto: KIOSKO-STREAMBE
 * Valida sesión contra Auth y Rol contra tabla pública 'users'
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 1. Obtener la identidad del usuario desde el servicio de autenticación
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // 2. Control de acceso para usuarios no autenticados
  if (!user && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 3. Obtener el Rol desde la tabla pública si el usuario está autenticado
  let userRole = null
  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    
    userRole = userData?.role
  }

  // 4. Redirecciones automáticas para la raíz y página de login
  if (user && (pathname === '/login' || pathname === '/')) {
    const defaultRoute = userRole === 'ADMIN' ? '/dashboard' : '/operador'
    return NextResponse.redirect(new URL(defaultRoute, request.url))
  }

  // 5. Protección estricta de rutas administrativas (RBAC)
  const isAdministrativeRoute = pathname.startsWith('/admin') || pathname.startsWith('/dashboard')
  
  if (isAdministrativeRoute && userRole !== 'ADMIN') {
    // Si no es explícitamente ADMIN, se redirige al panel de operador
    return NextResponse.redirect(new URL('/operador', request.url))
  }

  return response
}

export const config = {
  // Aplicar el proxy a todas las rutas excepto archivos estáticos y APIs
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}