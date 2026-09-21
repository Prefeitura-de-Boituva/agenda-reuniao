import type { Booking, Room } from "@/types/schedule";
import { generateTimeSlots, parseDate } from "@/lib/schedule";

export const ROOMS: Room[] = [
  { id: "sala-azul", name: "Sala Azul" },
  { id: "sala-verde", name: "Sala Verde" },
  { id: "sala-amarela", name: "Sala Amarela" },
];

const MOCK_NAMES = [
  { name: "Maria Silva", department: "Saúde" },
  { name: "João Santos", department: "Educação" },
  { name: "Ana Oliveira", department: "Obras" },
  { name: "Carlos Pereira", department: "Finanças" },
  { name: "Fernanda Costa", department: "RH" },
  { name: "Paulo Souza", department: "Administração" },
];

const MOCK_BLOCKS: Array<{ room: string; startOffset: number; length: number }> = [
  { room: "sala-azul", startOffset: 0, length: 2 },
  { room: "sala-azul", startOffset: 6, length: 1 },
  { room: "sala-verde", startOffset: 4, length: 1 },
  { room: "sala-verde", startOffset: 12, length: 2 },
  { room: "sala-amarela", startOffset: 2, length: 2 },
  { room: "sala-amarela", startOffset: 9, length: 1 },
];

export function getMockBookings(date: string): Booking[] {
  const slots = generateTimeSlots();
  const dayOfMonth = parseDate(date).getDate();
  const seed = dayOfMonth % MOCK_BLOCKS.length;
  const rotatedBlocks = [...MOCK_BLOCKS.slice(seed), ...MOCK_BLOCKS.slice(0, seed)];

  const bookings: Booking[] = [];
  let bookingIndex = 0;

  for (const block of rotatedBlocks) {
    if (block.startOffset + block.length > slots.length) continue;

    const person = MOCK_NAMES[bookingIndex % MOCK_NAMES.length];
    const booking: Booking = {
      id: `${date}-${bookingIndex}`,
      roomId: block.room,
      date,
      name: person.name,
      department: person.department,
      startTime: slots[block.startOffset].startTime,
      endTime: slots[block.startOffset + block.length - 1].endTime,
    };
    bookings.push(booking);
    bookingIndex++;
  }

  return bookings;
}
