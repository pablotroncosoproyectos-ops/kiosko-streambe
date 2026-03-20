import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { loginWithEmailAndPassword } from "@/services/authService";

interface LoginRequestBody {
  email: string;
  password: string;
}

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

function getSupabaseEnvironmentConfiguration(): {
  supabaseUrl: string;
  supabaseAnonymousPublicKey: string;
} {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonymousPublicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (typeof supabaseUrl !== "string" || supabaseUrl.trim().length === 0) {
    throw new Error("Missing server configuration");
  }

  if (
    typeof supabaseAnonymousPublicKey !== "string" ||
    supabaseAnonymousPublicKey.trim().length === 0
  ) {
    throw new Error("Missing server configuration");
  }

  return { supabaseUrl, supabaseAnonymousPublicKey };
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const requestBody: unknown = await request.json();

    if (!isValidLoginRequestBody(requestBody)) {
      return NextResponse.json(
        { message: "Invalid request body" },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const { supabaseUrl, supabaseAnonymousPublicKey } =
      getSupabaseEnvironmentConfiguration();

    const supabaseServerClient = createServerClient(
      supabaseUrl,
      supabaseAnonymousPublicKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      },
    );

    const authenticatedUserSession = await loginWithEmailAndPassword(
      supabaseServerClient,
      {
        email: requestBody.email,
        password: requestBody.password,
      },
    );

    return NextResponse.json(
      {
        message: "Login successful",
        userProfile: authenticatedUserSession.userProfile,
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message === "Invalid credentials") {
        return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
      }

      if (error.message === "Inactive account") {
        return NextResponse.json({ message: "Inactive account" }, { status: 403 });
      }

      if (error.message === "Missing server configuration") {
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
