import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { requireAuthenticatedAdministratorSupabaseClient } from "@/lib/supabase-server-route";

const BRAND_ASSETS_BUCKET_NAME = "brand_assets";
const MAX_LOGO_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function createSupabaseServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (typeof supabaseUrl !== "string" || supabaseUrl.trim().length === 0) {
    throw new Error("Missing Supabase configuration");
  }
  if (typeof serviceRoleKey !== "string" || serviceRoleKey.trim().length === 0) {
    throw new Error("Missing Supabase service role key");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    await requireAuthenticatedAdministratorSupabaseClient();
    const supabaseServiceRoleClient = createSupabaseServiceRoleClient();

    const formData = await request.formData();
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ message: "Archivo no válido o ausente" }, { status: 400 });
    }
    if (fileEntry.size === 0) {
      return NextResponse.json({ message: "El archivo está vacío" }, { status: 400 });
    }
    if (fileEntry.size > MAX_LOGO_IMAGE_BYTES) {
      return NextResponse.json(
        { message: "La imagen supera el tamaño máximo permitido (5 MB)" },
        { status: 400 },
      );
    }

    const fileExtension = ALLOWED_IMAGE_MIME_TYPES[fileEntry.type];
    if (typeof fileExtension !== "string") {
      return NextResponse.json(
        { message: "Formato no permitido. Use JPEG, PNG, WebP o GIF." },
        { status: 400 },
      );
    }

    const objectPath = `branding/logo-${randomUUID()}-${Date.now()}.${fileExtension}`;
    const fileBuffer = Buffer.from(await fileEntry.arrayBuffer());

    const { error: uploadError } = await supabaseServiceRoleClient.storage
      .from(BRAND_ASSETS_BUCKET_NAME)
      .upload(objectPath, fileBuffer, {
        contentType: fileEntry.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        {
          message:
            "No se pudo subir el logo. Verifique el bucket `brand_assets` y sus políticas.",
        },
        { status: 500 },
      );
    }

    const { data: publicUrlData } = supabaseServiceRoleClient.storage
      .from(BRAND_ASSETS_BUCKET_NAME)
      .getPublicUrl(objectPath);

    const resolvedPublicUrl =
      typeof publicUrlData?.publicUrl === "string"
        ? publicUrlData.publicUrl.trim()
        : "";

    if (resolvedPublicUrl.length === 0) {
      return NextResponse.json(
        { message: "No se pudo obtener la URL pública del logo." },
        { status: 500 },
      );
    }

    const { error: updateError } = await supabaseServiceRoleClient
      .from("business_settings")
      .upsert({ logo_url: resolvedPublicUrl }, { onConflict: "id" });

    if (updateError) {
      return NextResponse.json(
        { message: "Logo subido, pero no se pudo guardar la configuración." },
        { status: 500 },
      );
    }

    return NextResponse.json({ logoUrl: resolvedPublicUrl }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ message: "Se requiere autenticación" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Authorized role required") {
      return NextResponse.json({ message: "No autorizado" }, { status: 403 });
    }
    return NextResponse.json({ message: "No se pudo procesar la solicitud" }, { status: 500 });
  }
}

