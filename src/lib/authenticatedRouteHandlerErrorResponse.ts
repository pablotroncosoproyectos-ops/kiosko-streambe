import { NextResponse } from "next/server";

/**
 * Maps known server errors to HTTP responses without leaking stack traces.
 */
export function buildSanitizedAuthenticatedRouteHandlerResponse(
  error: unknown,
): NextResponse {
  if (!(error instanceof Error)) {
    return NextResponse.json(
      { message: "Unable to process request" },
      { status: 500 },
    );
  }

  const errorMessage = error.message;

  if (errorMessage === "Authentication required") {
    return NextResponse.json({ message: "Authentication required" }, { status: 401 });
  }

  if (errorMessage === "Authorized role required") {
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

  if (errorMessage === "Invalid report calendar date") {
    return NextResponse.json({ message: errorMessage }, { status: 400 });
  }

  if (
    errorMessage === "Unable to load daily sales summary metrics" ||
    errorMessage === "Unable to load critical stock alert count" ||
    errorMessage === "Unable to load top selling products" ||
    errorMessage === "Unable to load daily closure report metrics" ||
    errorMessage === "Unable to load inventory movements"
  ) {
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }

  return NextResponse.json(
    { message: "Unable to process request" },
    { status: 500 },
  );
}
