import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret";

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("admin_session")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
      if (decoded.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } catch (err) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    
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
