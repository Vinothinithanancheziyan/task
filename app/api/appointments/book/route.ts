import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { validateBooking } from "@/lib/appointment-logic";

export async function POST(req: NextRequest) {
  try {
    const { slotId, doctorId } = await req.json();

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const patientId = user.id;

    // Use extracted logic
    const validation = await validateBooking(supabaseAdmin, patientId, doctorId, slotId);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // 4. Update slot and create appointment (Atomic update using admin client)
    const { error: slotUpdateError } = await supabaseAdmin
      .from("slots")
      .update({ is_booked: true })
      .eq("id", slotId);

    if (slotUpdateError) {
      return NextResponse.json({ error: "Failed to update slot" }, { status: 500 });
    }

    const { error: insertError } = await supabaseAdmin.from("appointments").insert({
      patient_id: patientId,
      doctor_id: doctorId,
      slot_id: slotId,
      status: "active",
    });

    if (insertError) {
      // Rollback slot update
      await supabaseAdmin.from("slots").update({ is_booked: false }).eq("id", slotId);
      return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
    }

    return NextResponse.json({ message: "Appointment booked successfully" });
  } catch (err) {
    console.error("Booking error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
