import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearClientAuthCookie } from "@/lib/auth/dashboardSession";

export async function POST() {
  const cookieStore = await cookies();
  clearClientAuthCookie(cookieStore);
  return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
}
