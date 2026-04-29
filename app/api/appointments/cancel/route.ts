import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { canCancelAppointment } from "@/lib/appointment-logic";

export async function POST(req: NextRequest) {
  try {
    const { appointmentId, action } = await req.json(); // action: "cancel" | "done"

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return NextResponse.json({ error: "Missing authorization header" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: appt, error: apptError } = await supabaseAdmin
      .from("appointments")
      .select("*, slots(start_time)")
      .eq("id", appointmentId)
      .single();

    if (apptError || !appt) return NextResponse.json({ error: "Appointment not found" }, { status: 404 });

    // Use extracted logic for cancellation validation
    if (action === "cancel") {
      const validation = canCancelAppointment(appt, user.id);
      if (!validation.canCancel) {
        return NextResponse.json({ error: validation.error }, { status: 400 });
      }
    } else if (action === "done") {
      if (appt.doctor_id !== user.id) {
        return NextResponse.json({ error: "Only doctors can mark as done" }, { status: 403 });
      }
    }

    // 5. Update appointment
    const newStatus = action === "cancel" ? "cancelled" : "done";
    const { error: updateError } = await supabaseAdmin
      .from("appointments")
      .update({ status: newStatus })
      .eq("id", appointmentId);

    if (updateError) {
      return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 });
    }

    // 6. If cancelled, release the slot
    if (action === "cancel") {
      await supabaseAdmin
        .from("slots")
        .update({ is_booked: false })
        .eq("id", appt.slot_id);
    }

    return NextResponse.json({ message: `Appointment ${action}ed successfully` });
  } catch (err) {
    console.error("Cancellation error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
