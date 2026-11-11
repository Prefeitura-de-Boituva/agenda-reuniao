import { describe, it, expect } from "vitest";
import type { Booking, Room } from "@/types/schedule";
import { computeDayStats } from "../stats";

const ROOMS: Room[] = [
  { id: "sala-azul", name: "Sala Azul" },
  { id: "sala-verde", name: "Sala Verde" },
];

const booking = (overrides: Partial<Booking>): Booking => ({
  id: "b1",
  roomId: "sala-azul",
  date: "2026-11-11",
  name: "Reunião",
  department: "Chefia de Gabinete",
  startTime: "09:00",
  endTime: "10:00",
  ...overrides,
});

describe("computeDayStats", () => {
  it("conta as salas do sistema e deixa tudo zerado sem reservas", () => {
    const stats = computeDayStats(ROOMS, {});

    expect(stats.roomCount).toBe(2);
    expect(stats.totalBookings).toBe(0);
    expect(stats.totalOccupiedSlots).toBe(0);
    // Grade das 08:00 às 17:00 em blocos de 30 minutos = 18 por sala.
    expect(stats.byRoom["sala-azul"].totalSlots).toBe(18);
    expect(stats.totalSlots).toBe(36);
  });

  it("converte o intervalo de uma reserva em blocos de 30 minutos", () => {
    const stats = computeDayStats(ROOMS, { "sala-azul": [booking({})] });

    expect(stats.byRoom["sala-azul"].bookingCount).toBe(1);
    expect(stats.byRoom["sala-azul"].occupiedSlots).toBe(2);
    expect(stats.byRoom["sala-verde"].occupiedSlots).toBe(0);
    expect(stats.totalBookings).toBe(1);
    expect(stats.totalOccupiedSlots).toBe(2);
  });

  it("conta reserva de 90 minutos como três blocos e não ultrapassa a grade", () => {
    const stats = computeDayStats(ROOMS, {
      "sala-azul": [
        booking({ id: "a", startTime: "15:00", endTime: "16:30" }),
        // Dura até depois do fechamento: só os blocos das 16:30–17:00 contam.
        booking({ id: "b", startTime: "16:00", endTime: "18:00" }),
      ],
    });

    expect(stats.byRoom["sala-azul"].bookingCount).toBe(2);
    expect(stats.byRoom["sala-azul"].occupiedSlots).toBe(4);
  });

  it("soma as reservas de todas as salas para o detalhe agregado", () => {
    const stats = computeDayStats(ROOMS, {
      "sala-azul": [booking({ roomId: "sala-azul" })],
      "sala-verde": [
        booking({ id: "v1", roomId: "sala-verde", startTime: "08:00", endTime: "09:00" }),
        booking({ id: "v2", roomId: "sala-verde", startTime: "11:00", endTime: "11:30" }),
      ],
    });

    expect(stats.totalBookings).toBe(3);
    expect(stats.totalOccupiedSlots).toBe(5);
    expect(stats.byRoom["sala-verde"].bookingCount).toBe(2);
  });
});
