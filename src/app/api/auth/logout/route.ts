import { NextResponse } from "next/server";
import { createSupabaseServerClientUsingCookies } from "@/lib/supabase-server-route";

export async function POST(): Promise<NextResponse> {
  try {
    const supabaseServerClient = await createSupabaseServerClientUsingCookies();
    await supabaseServerClient.auth.signOut();
    return NextResponse.json({ message: "Logout successful" }, { status: 200 });
  } catch {
    return NextResponse.json({ message: "Unable to logout" }, { status: 500 });
  }
}
