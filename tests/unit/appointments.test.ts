import { describe, it, expect, vi } from "vitest";
import { validateBooking, canCancelAppointment } from "../../lib/appointment-logic";

describe("Appointment Logic Unit Tests", () => {
  describe("validateBooking", () => {
    it("should fail if slot is already booked", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_booked: true }, error: null }),
      } as any;

      const result = await validateBooking(mockSupabase, "p1", "d1", "s1");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("Slot is already booked");
    });

    it("should fail if patient already has an active appointment with the same doctor", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_booked: false }, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: "existing_appt" }, error: null }),
      } as any;

      const result = await validateBooking(mockSupabase, "p1", "d1", "s1");
      expect(result.valid).toBe(false);
      expect(result.error).toBe("You already have an active appointment with this doctor");
    });

    it("should succeed if slot is available and no existing active appointment", async () => {
      const mockSupabase = {
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { is_booked: false }, error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any;

      const result = await validateBooking(mockSupabase, "p1", "d1", "s1");
      expect(result.valid).toBe(true);
    });
  });

  describe("canCancelAppointment", () => {
    const oneHour = 60 * 60 * 1000;
    
    it("should fail if patient tries to cancel an appointment starting in less than 1 hour", () => {
      const startTime = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 mins from now
      const appt = {
        status: "active",
        patient_id: "p1",
        doctor_id: "d1",
        slots: { start_time: startTime }
      };

      const result = canCancelAppointment(appt as any, "p1");
      expect(result.canCancel).toBe(false);
      expect(result.error).toBe("Cannot cancel appointment starting in less than 1 hour");
    });

    it("should succeed if doctor tries to cancel anytime", () => {
      const startTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const appt = {
        status: "active",
        patient_id: "p1",
        doctor_id: "d1",
        slots: { start_time: startTime }
      };

      const result = canCancelAppointment(appt as any, "d1");
      expect(result.canCancel).toBe(true);
    });

    it("should fail if patient tries to cancel a non-active appointment", () => {
      const appt = {
        status: "done",
        patient_id: "p1",
        doctor_id: "d1",
        slots: { start_time: new Date(Date.now() + 2 * oneHour).toISOString() }
      };

      const result = canCancelAppointment(appt as any, "p1");
      expect(result.canCancel).toBe(false);
      expect(result.error).toBe("Appointment is already done or cancelled");
    });
  });
});
