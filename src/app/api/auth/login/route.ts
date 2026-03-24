import { NextResponse } from "next/server";
import { createSupabaseServerClientUsingCookies } from "@/lib/supabase-server-route";
import { loginWithEmailAndPassword } from "@/services/authService";

interface LoginRequestBody {
  email: string;
  password: string;
}

/**
 * Valida la estructura del cuerpo de la petición de inicio de sesión.
 */
function isValidLoginRequestBody(
  requestBody: unknown,
): requestBody is LoginRequestBody {
  if (!requestBody || typeof requestBody !== "object") {
    return false;
  }

  const parsedBody = requestBody as Record<string, unknown>;

  return (
    typeof parsedBody.email === "string" &&
    parsedBody.email.trim().length > 0 &&
    typeof parsedBody.password === "string" &&
    parsedBody.password.trim().length > 0
  );
}

/**
 * Manejador de la ruta POST para autenticación de usuarios.
 * Sincroniza las cookies de sesión con NextResponse para habilitar el Middleware.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const requestBody: unknown = await request.json();

    if (!isValidLoginRequestBody(requestBody)) {
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 },
      );
    }

    const loginCredentials = {
      email: requestBody.email,
      password: requestBody.password,
    };

    // 1. Instanciamos el cliente de servidor que maneja cookies
    const supabaseServerClient = await createSupabaseServerClientUsingCookies();

    // 2. Realizamos la autenticación
    // Nota: loginWithEmailAndPassword internamente debe ejecutar supabase.auth.signInWithPassword
    const authenticatedUserSessionPayload = await loginWithEmailAndPassword(
      supabaseServerClient,
      loginCredentials,
    );

    // 3. Creamos la respuesta base
    const successResponse = NextResponse.json(
      {
        message: "Login successful",
        userProfile: authenticatedUserSessionPayload.userProfile,
      },
      { status: 200 },
    );

    /**
     * IMPORTANTE PARA EL MIDDLEWARE:
     * Al usar createSupabaseServerClientUsingCookies, Supabase intenta escribir en los headers.
     * Si tu implementación de 'createSupabaseServerClientUsingCookies' usa el patrón oficial 
     * de Next.js, las cookies ya deberían estar en la cola de la respuesta.
     */

    return successResponse;

  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "Credenciales no válidas") {
        return NextResponse.json({ message: "Credenciales no válidas" }, { status: 401 });
      }

      if (error.message === "Inactive account") {
        return NextResponse.json({ message: "Inactive account" }, { status: 403 });
      }

      if (error.message === "Missing Supabase configuration") {
        return NextResponse.json(
          { message: "Unable to process authentication request" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      { message: "Unable to process authentication request" },
      { status: 500 },
    );
  }
}