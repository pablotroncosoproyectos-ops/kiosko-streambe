import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category } from "@/types/database";

const MAX_CATEGORY_NAME_LENGTH = 80;

interface CategoryDatabaseRow {
  id: string;
  name: string;
  created_at: string;
}

function mapCategoryRow(row: CategoryDatabaseRow): Category {
  return {
    id: row.id,
    name: typeof row.name === "string" ? row.name : "",
    createdAt: row.created_at,
  };
}

export function normalizeCategoryNameForDatabase(raw: string): string {
  const normalized = raw.trim().toUpperCase();
  if (
    normalized.length === 0 ||
    normalized.length > MAX_CATEGORY_NAME_LENGTH
  ) {
    throw new Error("Invalid category name");
  }
  return normalized;
}

export async function listAllCategories(
  supabaseServerClient: SupabaseClient,
): Promise<Category[]> {
  const { data: rows, error } = await supabaseServerClient
    .from("categories")
    .select("id, name, created_at")
    .order("name", { ascending: true });

  if (error) {
    console.error("listAllCategories:", error);
    throw new Error("Unable to list categories");
  }

  return (rows ?? []).map((row) =>
    mapCategoryRow(row as CategoryDatabaseRow),
  );
}

/**
 * Asegura que exista una fila en `categories` con el nombre normalizado (MAYÚSCULAS).
 * Idempotente: si ya existe, no falla.
 */
export async function ensureCategoryExistsInDatabase(
  supabaseServerClient: SupabaseClient,
  rawCategoryName: string,
): Promise<void> {
  const name = normalizeCategoryNameForDatabase(rawCategoryName);

  const { error: insertError } = await supabaseServerClient
    .from("categories")
    .insert({ name });

  if (!insertError) {
    return;
  }

  if (insertError.code === "23505") {
    return;
  }

  console.error("ensureCategoryExistsInDatabase:", insertError);
  throw new Error(
    insertError.message
      ? `${insertError.message} (code ${insertError.code})`
      : "Unable to save category",
  );
}

export async function deleteCategoryById(
  supabaseServerClient: SupabaseClient,
  categoryIdentifier: string,
): Promise<void> {
  const { error } = await supabaseServerClient
    .from("categories")
    .delete()
    .eq("id", categoryIdentifier);

  if (error) {
    console.error("deleteCategoryById:", error);
    throw new Error(
      error.message
        ? `${error.message} (code ${error.code})`
        : "Unable to delete category",
    );
  }
}
