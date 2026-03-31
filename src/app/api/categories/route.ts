import { NextResponse } from "next/server";
import {
  requireAuthenticatedAdministratorSupabaseClient,
  requireAuthenticatedAuthorizedSupabaseClient,
} from "@/lib/supabase-server-route";
import {
  deleteCategoryById,
  ensureCategoryExistsInDatabase,
  listAllCategories,
} from "@/services/categoryService";

function buildCategoriesErrorResponse(error: unknown): NextResponse {
  if (!(error instanceof Error)) {
    return NextResponse.json(
      { message: "Unable to process request" },
      { status: 500 },
    );
  }

  const errorMessage = error.message;

  if (errorMessage === "Authentication required") {
    return NextResponse.json({ message: errorMessage }, { status: 401 });
  }

  if (
    errorMessage === "Administrator role required" ||
    errorMessage === "Authorized role required"
  ) {
    return NextResponse.json(
      { message: "Authorized role required" },
      { status: 403 },
    );
  }

  if (errorMessage === "Missing Supabase configuration") {
    return NextResponse.json(
      { message: "Unable to process request" },
      { status: 500 },
    );
  }

  if (errorMessage === "Unable to list categories") {
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }

  if (errorMessage === "Invalid category name") {
    return NextResponse.json({ message: errorMessage }, { status: 400 });
  }

  return NextResponse.json({ message: errorMessage }, { status: 500 });
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabaseServerClient =
      await requireAuthenticatedAuthorizedSupabaseClient(["ADMIN", "OPERATOR"]);
    const categories = await listAllCategories(supabaseServerClient);
    return NextResponse.json({ categories }, { status: 200 });
  } catch (error: unknown) {
    return buildCategoriesErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const supabaseServerClient =
      await requireAuthenticatedAuthorizedSupabaseClient(["ADMIN", "OPERATOR"]);

    const requestBody: unknown = await request.json();
    if (
      !requestBody ||
      typeof requestBody !== "object" ||
      typeof (requestBody as { name?: unknown }).name !== "string"
    ) {
      return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
    }

    const rawName = (requestBody as { name: string }).name;
    await ensureCategoryExistsInDatabase(supabaseServerClient, rawName);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    return buildCategoriesErrorResponse(error);
  }
}

export async function DELETE(request: Request): Promise<NextResponse> {
  try {
    const supabaseServerClient =
      await requireAuthenticatedAdministratorSupabaseClient();

    const url = new URL(request.url);
    const categoryIdentifier = url.searchParams.get("id");
    if (
      typeof categoryIdentifier !== "string" ||
      categoryIdentifier.trim().length === 0
    ) {
      return NextResponse.json({ message: "Missing category id" }, { status: 400 });
    }

    await deleteCategoryById(supabaseServerClient, categoryIdentifier.trim());

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: unknown) {
    return buildCategoriesErrorResponse(error);
  }
}
