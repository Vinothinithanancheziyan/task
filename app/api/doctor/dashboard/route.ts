import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [doctorRes, slotData, apptData] = await Promise.all([
      supabaseAdmin
        .from("doctors")
        .select("*")
        .eq("id", user.id)
        .single(),
      supabaseAdmin
        .from("slots")
        .select("*, appointments(patients(name))")
        .eq("doctor_id", user.id)
        .order("start_time"),
      supabaseAdmin
        .from("appointments")
        .select("id, status, created_at, patients(name), slots(start_time, end_time)")
        .eq("doctor_id", user.id)
        .order("created_at", { ascending: false })
    ]);

    if (doctorRes.error || slotData.error || apptData.error) {
      return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
    }

    return NextResponse.json({
      doctor: doctorRes.data,
      slots: slotData.data,
      appointments: apptData.data
    });
  } catch (err) {
    console.error("Doctor dashboard API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
