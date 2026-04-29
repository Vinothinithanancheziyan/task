import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(_req: NextRequest) {
  try {
    // In a real app, we would verify the admin session/token here.
    
    const { data: appointments, error } = await supabaseAdmin
      .from("appointments")
      .select(`
        id,
        status,
        created_at,
        patient:patients(name, email),
        doctor:doctors(name, specialty),
        slot:slots(start_time, end_time)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Admin fetch appointments error:", error);
      return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
    }

    return NextResponse.json({ appointments });
  } catch (err) {
    console.error("Admin appointments route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
