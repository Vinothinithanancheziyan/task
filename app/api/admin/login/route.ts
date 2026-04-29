import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    const { data: admin, error } = await supabaseAdmin
      .from("system_admins")
      .select("*")
      .eq("email", email)
      .eq("password", password)
      .maybeSingle();

    if (error || !admin) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // In a real app, we would issue a JWT here. 
    // For this implementation, we return success and the client handles a basic session.
    return NextResponse.json({ message: "Login successful", admin: { email: admin.email } });
  } catch (err) {
    console.error("Admin login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
