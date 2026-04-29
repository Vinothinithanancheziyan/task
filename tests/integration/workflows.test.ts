import { describe, it, expect, beforeAll } from "vitest";
import { supabaseAdmin } from "../../lib/supabase-admin";

describe("Appointment Workflows Integration Tests", () => {
  let testPatientId: string;
  let testDoctorId: string;
  let testSlotId: string;

  beforeAll(async () => {
    // Increased timeout for database connection
    // Get a test patient, doctor and available slot in parallel
    const [docRes, patRes, slotRes] = await Promise.all([
      supabaseAdmin.from("doctors").select("id").limit(1).maybeSingle(),
      supabaseAdmin.from("patients").select("id").limit(1).maybeSingle(),
      supabaseAdmin.from("slots").select("id").eq("is_booked", false).limit(1).maybeSingle()
    ]);

    const { data: doctor, error: docError } = docRes;
    const { data: patient, error: patError } = patRes;
    const { data: slot, error: slotError } = slotRes;

    if (docError || patError || slotError) {
      throw new Error(`Setup failed: ${docError?.message || patError?.message || slotError?.message}`);
    }

    if (!doctor || !patient || !slot) {
      throw new Error("Setup failed: Missing test data in database. Please run npm run seed first.");
    }

    testDoctorId = doctor.id;
    testPatientId = patient.id;
    testSlotId = slot.id;
  }, 60000); // 60s timeout

  it("should complete the booking flow successfully", async () => {
    // 1. Check initial state
    const { data: initialSlot } = await supabaseAdmin.from("slots").select("is_booked").eq("id", testSlotId).single();
    expect(initialSlot).not.toBeNull();
    expect(initialSlot!.is_booked).toBe(false);

    // 2. Perform booking
    const { data: appt, error: apptError } = await supabaseAdmin.from("appointments").insert({
      patient_id: testPatientId,
      doctor_id: testDoctorId,
      slot_id: testSlotId,
      status: "active",
    }).select().single();

    if (apptError) throw apptError;
    
    expect(appt).not.toBeNull();
    expect(appt!.status).toBe("active");
    
    await supabaseAdmin.from("slots").update({ is_booked: true }).eq("id", testSlotId);

    expect(appt!.status).toBe("active");

    // 3. Verify final state
    const { data: finalSlot } = await supabaseAdmin.from("slots").select("is_booked").eq("id", testSlotId).single();
    expect(finalSlot).not.toBeNull();
    expect(finalSlot!.is_booked).toBe(true);
    
    // Clean up
    await supabaseAdmin.from("appointments").delete().eq("id", appt.id);
    await supabaseAdmin.from("slots").update({ is_booked: false }).eq("id", testSlotId);
  });

  it("should complete the cancellation flow successfully", async () => {
    // 1. Setup: Create an appointment
    await supabaseAdmin.from("slots").update({ is_booked: true }).eq("id", testSlotId);
    const { data: appt } = await supabaseAdmin.from("appointments").insert({
      patient_id: testPatientId,
      doctor_id: testDoctorId,
      slot_id: testSlotId,
      status: "active",
    }).select().single();

    // 2. Perform cancellation
    await supabaseAdmin.from("appointments").update({ status: "cancelled" }).eq("id", appt.id);
    await supabaseAdmin.from("slots").update({ is_booked: false }).eq("id", testSlotId);

    // 3. Verify status update and slot release
    const { data: updatedAppt } = await supabaseAdmin.from("appointments").select("status").eq("id", appt.id).single();
    const { data: releasedSlot } = await supabaseAdmin.from("slots").select("is_booked").eq("id", testSlotId).single();

    expect(updatedAppt).not.toBeNull();
    expect(releasedSlot).not.toBeNull();
    expect(updatedAppt!.status).toBe("cancelled");
    expect(releasedSlot!.is_booked).toBe(false);

    // Clean up
    await supabaseAdmin.from("appointments").delete().eq("id", appt.id);
  });
});
