import { SupabaseClient } from "@supabase/supabase-js";

export async function validateBooking(
  supabase: SupabaseClient,
  patientId: string,
  doctorId: string,
  slotId: string
) {
  // 1. Check if slot is already booked
  const { data: slot, error: slotError } = await supabase
    .from("slots")
    .select("is_booked")
    .eq("id", slotId)
    .single();

  if (slotError || !slot) return { valid: false, error: "Slot not found" };
  if (slot.is_booked) return { valid: false, error: "Slot is already booked" };

  // 2. Check if patient has an active appointment with the same doctor
  const { data: existingAppt, error: apptCheckError } = await supabase
    .from("appointments")
    .select("id")
    .eq("patient_id", patientId)
    .eq("doctor_id", doctorId)
    .eq("status", "active")
    .maybeSingle();

  if (apptCheckError) return { valid: false, error: "Error checking appointments" };
  if (existingAppt) return { valid: false, error: "You already have an active appointment with this doctor" };

  return { valid: true };
}

export function canCancelAppointment(
  appointment: { status: string; patient_id: string; doctor_id: string; slots: { start_time: string } },
  userId: string
) {
  const isPatient = appointment.patient_id === userId;
  const isDoctor = appointment.doctor_id === userId;

  if (!isPatient && !isDoctor) return { canCancel: false, error: "Forbidden" };

  if (isPatient) {
    if (appointment.status !== "active") {
      return { canCancel: false, error: "Appointment is already done or cancelled" };
    }

    const startTime = new Date(appointment.slots.start_time).getTime();
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    if (startTime - now < oneHour) {
      return { canCancel: false, error: "Cannot cancel appointment starting in less than 1 hour" };
    }
  }

  // Doctors can cancel anytime
  return { canCancel: true };
}
