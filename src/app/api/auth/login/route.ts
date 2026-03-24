import { NextResponse } from "next/server";
import { createSupabaseServerClientUsingCookies } from "@/lib/supabase-server-route";
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

    const supabaseServerClient = await createSupabaseServerClientUsingCookies();

    const authenticatedUserSessionPayload = await loginWithEmailAndPassword(
      supabaseServerClient,
      loginCredentials,
    );

    return NextResponse.json(
      {
        message: "Login successful",
        userProfile: authenticatedUserSessionPayload.userProfile,
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
