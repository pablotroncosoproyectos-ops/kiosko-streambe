import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { requireAuthenticatedAuthorizedSupabaseClient } from "@/lib/supabase-server-route";

const PRODUCT_IMAGES_BUCKET_NAME = "product-images";

const MAX_PRODUCT_IMAGE_BYTES = 5 * 1024 * 1024;

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

function buildSanitizedErrorResponse(error: unknown): NextResponse {
  if (!(error instanceof Error)) {
    return NextResponse.json(
      { message: "No se pudo procesar la solicitud" },
      { status: 500 },
    );
  }

  const errorMessage = error.message;

  if (errorMessage === "Authentication required") {
    return NextResponse.json(
      { message: "Se requiere autenticación" },
      { status: 401 },
    );
  }

  if (
    errorMessage === "Administrator role required" ||
    errorMessage === "Authorized role required"
  ) {
    return NextResponse.json({ message: "No autorizado" }, { status: 403 });
  }

  if (errorMessage === "Missing Supabase configuration") {
    return NextResponse.json(
      { message: "No se pudo procesar la solicitud" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { message: "No se pudo procesar la solicitud" },
    { status: 500 },
  );
}

export async function POST(request: Request): Promise<NextResponse> {
  console.log("API received request for upload");
  try {
    await requireAuthenticatedAuthorizedSupabaseClient(["ADMIN", "OPERATOR"]);
    const supabaseServiceRoleClient = createSupabaseServiceRoleClient();

    const formData = await request.formData();
    const fileEntry = formData.get("file");
    console.log("[upload-image] incoming formData file entry type:", {
      type: typeof fileEntry,
      isFile: fileEntry instanceof File,
    });

    if (!(fileEntry instanceof File)) {
      return NextResponse.json(
        { message: "Archivo no válido o ausente" },
        { status: 400 },
      );
    }

    if (fileEntry.size === 0) {
      return NextResponse.json(
        { message: "El archivo está vacío" },
        { status: 400 },
      );
    }

    if (fileEntry.size > MAX_PRODUCT_IMAGE_BYTES) {
      return NextResponse.json(
        { message: "La imagen supera el tamaño máximo permitido (5 MB)" },
        { status: 400 },
      );
    }

    const fileExtension = ALLOWED_IMAGE_MIME_TYPES[fileEntry.type];
    if (typeof fileExtension !== "string") {
      return NextResponse.json(
        {
          message:
            "Formato no permitido. Use JPEG, PNG, WebP o GIF.",
        },
        { status: 400 },
      );
    }

    const objectPath = `products/${randomUUID()}-${Date.now()}.${fileExtension}`;
    const fileBuffer = Buffer.from(await fileEntry.arrayBuffer());
    console.log("[upload-image] attempting upload:", {
      bucket: PRODUCT_IMAGES_BUCKET_NAME,
      objectPath,
      mimeType: fileEntry.type,
      sizeBytes: fileEntry.size,
    });

    const { error: uploadError } = await supabaseServiceRoleClient.storage
      .from(PRODUCT_IMAGES_BUCKET_NAME)
      .upload(objectPath, fileBuffer, {
        contentType: fileEntry.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("[upload-image] storage upload error:", {
        message: uploadError.message,
        name: uploadError.name,
        statusCode: (uploadError as { statusCode?: string }).statusCode ?? null,
        objectPath,
        bucket: PRODUCT_IMAGES_BUCKET_NAME,
      });
      return NextResponse.json(
        {
          message:
            "No se pudo subir la imagen. Compruebe el bucket y las políticas de Storage.",
        },
        { status: 500 },
      );
    }
    console.log("[upload-image] upload completed successfully", {
      bucket: PRODUCT_IMAGES_BUCKET_NAME,
      objectPath,
    });

    const { data: publicUrlData } = supabaseServiceRoleClient.storage
      .from(PRODUCT_IMAGES_BUCKET_NAME)
      .getPublicUrl(objectPath);

    const resolvedPublicUrl =
      typeof publicUrlData?.publicUrl === "string"
        ? publicUrlData.publicUrl.trim()
        : "";

    if (resolvedPublicUrl.length === 0) {
      console.error("[upload-image] empty public URL after upload", {
        objectPath,
        bucket: PRODUCT_IMAGES_BUCKET_NAME,
      });
      return NextResponse.json(
        { message: "No se pudo obtener la URL pública de la imagen" },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { publicUrl: resolvedPublicUrl },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("[upload-image] unexpected route error:", error);
    return buildSanitizedErrorResponse(error);
  }
}
