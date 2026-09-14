export type SlotStatus = "available" | "booked" | "past";

export interface Booking {
  id: string;
  name: string;
  department: string;
  startTime: string;
  endTime: string;
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  status: SlotStatus;
  booking?: Booking;
}

export interface Room {
  id: string;
  name: string;
}

export interface DaySchedule {
  date: string;
  rooms: Room[];
  slotsByRoom: Record<string, TimeSlot[]>;
}