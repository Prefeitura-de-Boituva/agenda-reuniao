import type { Booking, DaySchedule, Room, SlotStatus, TimeSlot } from "@/types/schedule";

export const OPENING_HOUR = 8;
export const CLOSING_HOUR = 17;
export const SLOT_MINUTES = 30;

export function generateTimeSlots(): Array<{ startTime: string; endTime: string }> {
  const slots: Array<{ startTime: string; endTime: string }> = [];

  for (let hour = OPENING_HOUR; hour < CLOSING_HOUR; hour++) {
    for (let minutes = 0; minutes < 60; minutes += SLOT_MINUTES) {
      const start = `${String(hour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      const endMinutes = minutes + SLOT_MINUTES;
      const end = `${String(hour).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;
      slots.push({ startTime: start, endTime: end });
    }
  }

  return slots;
}

export function isSameDate(date: Date, reference: Date): boolean {
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth() &&
    date.getDate() === reference.getDate()
  );
}

export function isSlotPast(date: string, startTime: string): boolean {
  const now = new Date();
  const slotDate = parseDate(date);

  if (!isSameDate(slotDate, now)) return false;

  const [hours, minutes] = startTime.split(":").map(Number);
  const slotDateTime = new Date(slotDate);
  slotDateTime.setHours(hours, minutes, 0, 0);

  return slotDateTime.getTime() < now.getTime();
}

export function parseDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shiftDate(date: Date, days: number): Date {
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + days);
  return shifted;
}

export function getNextWeekday(date: Date): Date {
  const next = new Date(date);
  do {
    next.setDate(next.getDate() + 1);
  } while (next.getDay() === 0 || next.getDay() === 6);
  return next;
}

export function getPreviousWeekday(date: Date): Date {
  const previous = new Date(date);
  do {
    previous.setDate(previous.getDate() - 1);
  } while (previous.getDay() === 0 || previous.getDay() === 6);
  return previous;
}

export function getBookingStatus(
  date: string,
  startTime: string,
  endTime: string,
  bookings: Booking[]
): { status: SlotStatus; booking?: Booking } {
  const booking = bookings.find((b) => b.startTime <= startTime && b.endTime >= endTime);
  if (booking) return { status: "booked", booking };
  if (isSlotPast(date, startTime)) return { status: "past" };
  return { status: "available" };
}

export function buildDaySchedule(date: string, rooms: Room[], bookings: Booking[]): DaySchedule {
  const rawSlots = generateTimeSlots();
  const slotsByRoom: Record<string, TimeSlot[]> = {};

  for (const room of rooms) {
    slotsByRoom[room.id] = rawSlots.map((slot) => {
      const { status, booking } = getBookingStatus(date, slot.startTime, slot.endTime, bookings);
      return { ...slot, status, booking };
    });
  }

  return { date, rooms, slotsByRoom };
}