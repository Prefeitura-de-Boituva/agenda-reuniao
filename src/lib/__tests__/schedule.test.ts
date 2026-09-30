import { describe, expect, it } from "vitest";
import { CLOSING_HOUR, OPENING_HOUR, SLOT_MINUTES, generateTimeSlots, getBookingStatus } from "@/lib/schedule";
import { isSlotValido, timeToMinutes } from "@/lib/validations";
import type { Booking } from "@/types/schedule";

const slots = generateTimeSlots();

describe("generateTimeSlots", () => {
  it("gera 18 slots por dia (2 por hora, das 08:00 às 16:30)", () => {
    const horas = CLOSING_HOUR - OPENING_HOUR;
    expect(slots).toHaveLength(horas * (60 / SLOT_MINUTES));
    expect(slots).toHaveLength(18);
  });

  it("começa em 08:00 e o último slot começa em 16:30", () => {
    expect(slots[0].startTime).toBe("08:00");
    expect(slots[slots.length - 1].startTime).toBe("16:30");
  });

  it("fecha o último slot em 17:00, sem transbordar o expediente", () => {
    expect(slots[slots.length - 1].endTime).toBe("17:00");
  });

  it("dura exatamente SLOT_MINUTES em todos os slots", () => {
    for (const slot of slots) {
      expect(timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime)).toBe(
        SLOT_MINUTES
      );
    }
  });

  it("mantém slots contíguos: o fim de um é o início do próximo", () => {
    for (let i = 0; i < slots.length - 1; i++) {
      expect(slots[i].endTime).toBe(slots[i + 1].startTime);
    }
  });

  it("não produz nenhum slot fora da janela 08:00–17:00", () => {
    for (const slot of slots) {
      expect(timeToMinutes(slot.startTime)).toBeGreaterThanOrEqual(
        timeToMinutes("08:00")
      );
      expect(timeToMinutes(slot.endTime)).toBeLessThanOrEqual(
        timeToMinutes("17:00")
      );
    }
  });

  /**
   * Regressão do hack do `:59`: o slot das `:30` terminava em `:59` (29
   * minutos) e obrigava `MIN_DURATION_MINUTES` a valer 29. Com a grade limpa,
   * todo slot isolado precisa passar em `isSlotValido` — caso contrário o
   * formulário de edição (`ScheduleGrid` → `BookingFormModal`, que bloqueia o
   * submit quando `isSlotValido` é falso) impediria encurtar uma reserva para
   * um único bloco iniciado em `:30`.
   */
  it("faz todo slot isolado passar em isSlotValido", () => {
    for (const slot of slots) {
      expect(isSlotValido(slot.startTime, slot.endTime)).toBe(true);
    }
  });
});

describe("getBookingStatus com a grade de 30 minutos", () => {
  const booking: Booking = {
    id: "b1",
    roomId: "sala-azul",
    date: "2026-09-30",
    name: "Reunião",
    department: "TI",
    startTime: "10:00",
    endTime: "10:30",
  };
  const bookings = [booking];

  it("marca como ocupado o slot exatamente correspondente", () => {
    expect(getBookingStatus("2026-09-30", "10:00", "10:30", bookings).status).toBe(
      "booked"
    );
  });

  it("marca como disponível o slot seguinte, apesar de começar no mesmo minuto", () => {
    expect(
      getBookingStatus("2026-09-30", "10:30", "11:00", bookings).status
    ).toBe("available");
  });

  it("marca como disponível o slot anterior", () => {
    expect(
      getBookingStatus("2026-09-30", "09:30", "10:00", bookings).status
    ).toBe("available");
  });
});
