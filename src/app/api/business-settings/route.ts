import { NextResponse } from "next/server";
import {
  requireAuthenticatedAdministratorSupabaseClient,
  requireAuthenticatedAuthorizedSupabaseClient,
} from "@/lib/supabase-server-route";

interface BusinessSettingsRow {
  id?: string | null;
  name?: string | null;
  logo_url?: string | null;
}

interface BusinessSettingsApiResponse {
  businessSettings?: {
    businessName: string;
    logoUrl: string | null;
  };
  message?: string;
}

function resolveBusinessSettingsFromRow(
  row: BusinessSettingsRow | null,
): BusinessSettingsApiResponse["businessSettings"] {
  const businessName =
    typeof row?.name === "string" && row.name.trim().length > 0
      ? row.name.trim()
      : "Kiosko Streambe";
  const logoUrl =
    typeof row?.logo_url === "string" && row.logo_url.trim().length > 0
      ? row.logo_url.trim()
      : null;
  return { businessName, logoUrl };
}

export async function GET(): Promise<NextResponse<BusinessSettingsApiResponse>> {
  try {
    const supabase = await requireAuthenticatedAuthorizedSupabaseClient([
      "ADMIN",
      "OPERATOR",
    ]);

    const { data, error } = await supabase
      .from("business_settings")
      .select("id, name, logo_url")
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { businessSettings: resolveBusinessSettingsFromRow(null) },
        { status: 200 },
      );
    }

    return NextResponse.json(
      { businessSettings: resolveBusinessSettingsFromRow(data as BusinessSettingsRow | null) },
      { status: 200 },
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ message: "Se requiere autenticación" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Authorized role required") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }
    return NextResponse.json(
      { message: "No se pudieron cargar los datos del negocio." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
): Promise<NextResponse<BusinessSettingsApiResponse>> {
  try {
    const supabase = await requireAuthenticatedAdministratorSupabaseClient();

    const body = (await request.json()) as unknown;
    const record = body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    const rawBusinessName = record?.name;
    const businessName =
      typeof rawBusinessName === "string" ? rawBusinessName.trim() : "";

    if (businessName.length === 0) {
      return NextResponse.json(
        { message: "El nombre del negocio es obligatorio." },
        { status: 400 },
      );
    }

    if (businessName.length > 80) {
      return NextResponse.json(
        { message: "El nombre del negocio no puede superar 80 caracteres." },
        { status: 400 },
      );
    }

    const { data: firstSettingsRow, error: firstSettingsRowError } = await supabase
      .from("business_settings")
      .select("id")
      .limit(1)
      .single();

    if (firstSettingsRowError || !firstSettingsRow?.id) {
      console.error("Error en PATCH settings:", firstSettingsRowError);
      return NextResponse.json(
        {
          message:
            firstSettingsRowError?.message ??
            "No se encontró un registro en business_settings para actualizar.",
        },
        { status: 400 },
      );
    }

    const updatePayload: { name: string; logo_url?: string | null } = {
      name: businessName,
    };
    if (record && Object.hasOwn(record, "logo_url")) {
      const rawLogoUrl = record.logo_url;
      updatePayload.logo_url =
        typeof rawLogoUrl === "string" && rawLogoUrl.trim().length > 0
          ? rawLogoUrl.trim()
          : null;
    }

    const { data, error } = await supabase
      .from("business_settings")
      .update(updatePayload)
      .eq("id", firstSettingsRow.id)
      .select("id, name, logo_url")
      .single();

    if (error) {
      console.error("Error en PATCH settings:", error);
      return NextResponse.json(
        { message: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { businessSettings: resolveBusinessSettingsFromRow(data as BusinessSettingsRow | null) },
      { status: 200 },
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ message: "Se requiere autenticación" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Authorized role required") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }
    console.error("Error en PATCH settings:", error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Error inesperado al guardar configuración." },
      { status: 500 },
    );
  }
}

