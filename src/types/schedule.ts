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

export interface RoomSchedule {
  roomId: string;
  roomName: string;
  dates: string[];
  slotsByDate: Record<string, TimeSlot[]>;
}