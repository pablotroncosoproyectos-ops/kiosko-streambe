import { NextResponse } from "next/server";
import { buildSanitizedAuthenticatedRouteHandlerResponse } from "@/lib/authenticatedRouteHandlerErrorResponse";
import {
  getAuthenticatedUserProfile,
  requireAuthenticatedAuthorizedSupabaseClient,
} from "@/lib/supabase-server-route";
import { startOrUpdateOpenRecreoSession } from "@/services/salesSessionService";

interface StartRecreoRequestBody {
  notes?: unknown;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabaseServerClient =
      await requireAuthenticatedAuthorizedSupabaseClient(["ADMIN", "OPERATOR"]);

    const authenticatedUserProfile = await getAuthenticatedUserProfile();

    let requestBody: StartRecreoRequestBody = {};
    try {
      requestBody = (await request.json()) as StartRecreoRequestBody;
    } catch {
      requestBody = {};
    }

    const result = await startOrUpdateOpenRecreoSession(
      supabaseServerClient,
      authenticatedUserProfile.id,
      requestBody.notes,
    );

    return NextResponse.json(
      {
        message: "Sesión de recreo lista",
        sessionIdentifier: result.sessionIdentifier,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (
        error.message === "Las notas del recreo superan la longitud máxima permitida"
      ) {
        return NextResponse.json({ message: error.message }, { status: 400 });
      }
      if (
        error.message === "Unable to start recreation session" ||
        error.message === "Unable to update recreation session notes" ||
        error.message === "Unable to create recreation session"
      ) {
        return NextResponse.json(
          { message: "No se pudo iniciar la sesión de recreo" },
          { status: 500 },
        );
      }
    }
    return buildSanitizedAuthenticatedRouteHandlerResponse(error);
  }
}
