import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { readMustChangePasswordFromUserMetadata } from '@/lib/authUserMetadata'

const MANDATORY_PASSWORD_CHANGE_PATHNAME = '/auth/cambiar-contrasena-obligatoria'
const AUTH_CALLBACK_PATHNAME = '/auth/callback'

/**
 * Proxy de Control de Acceso y Sesión (RBAC) - Actualizado para Next.js 16
 * Proyecto: KIOSKO-STREAMBE
 * Valida sesión contra Auth y Rol contra tabla pública 'users'
 */
export async function proxy(request: NextRequest) {
  const isLocalDevelopmentHost =
    request.nextUrl.hostname === 'localhost' ||
    request.nextUrl.hostname === '127.0.0.1'

  function resolveCookieOptions(options: CookieOptions): CookieOptions {
    return {
      ...options,
      path: '/',
      secure: isLocalDevelopmentHost ? false : options.secure,
    }
  }

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
          const normalizedOptions = resolveCookieOptions(options)
          request.cookies.set({ name, value, ...normalizedOptions })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...normalizedOptions })
        },
        remove(name: string, options: CookieOptions) {
          const normalizedOptions = resolveCookieOptions(options)
          request.cookies.set({ name, value: '', ...normalizedOptions })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...normalizedOptions })
        },
      },
    }
  )

  // 1. Identidad desde Auth
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const mustChangePassword = readMustChangePasswordFromUserMetadata(user)

  // 2. Sin sesión: solo login
  if (!user && pathname !== '/login' && pathname !== AUTH_CALLBACK_PATHNAME) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 3. Rol desde `public.users` (sesión autenticada)
  let userRole: string | null = null
  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    userRole = userData?.role ?? null
  }

  // 4. Cambio de contraseña obligatorio (user_metadata)
  if (user && mustChangePassword) {
    if (pathname !== MANDATORY_PASSWORD_CHANGE_PATHNAME) {
      return NextResponse.redirect(
        new URL(MANDATORY_PASSWORD_CHANGE_PATHNAME, request.url),
      )
    }
    return response
  }

  if (user && !mustChangePassword && pathname === MANDATORY_PASSWORD_CHANGE_PATHNAME) {
    const postChangeRoute = userRole === 'ADMIN' ? '/dashboard' : '/operador'
    return NextResponse.redirect(new URL(postChangeRoute, request.url))
  }

  // 5. Raíz y login con sesión válida
  if (user && (pathname === '/login' || pathname === '/')) {
    const defaultRoute = userRole === 'ADMIN' ? '/dashboard' : '/operador'
    return NextResponse.redirect(new URL(defaultRoute, request.url))
  }

  // 6. Rutas administrativas (RBAC)
  const isAdministrativeRoute =
    pathname.startsWith('/admin') || pathname.startsWith('/dashboard')

  if (isAdministrativeRoute && userRole !== 'ADMIN') {
    return NextResponse.redirect(new URL('/operador', request.url))
  }

  return response
}

export const config = {
  // Aplicar el proxy a todas las rutas excepto archivos estáticos y APIs
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}