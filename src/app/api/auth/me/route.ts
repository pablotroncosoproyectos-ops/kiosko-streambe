import { NextResponse } from "next/server";
import { getAuthenticatedUserProfile } from "@/lib/supabase-server-route";

export async function GET(): Promise<NextResponse> {
  try {
    const userProfile = await getAuthenticatedUserProfile();
    return NextResponse.json({ userProfile }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Authentication required") {
      return NextResponse.json({ message: "Authentication required" }, { status: 401 });
    }
    return NextResponse.json({ message: "Unable to load profile" }, { status: 500 });
  }
}
