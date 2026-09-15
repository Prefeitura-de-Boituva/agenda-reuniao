import type { Booking } from "@/types/schedule";
import { getMockBookings } from "@/lib/mock-data";

const MOCK_LATENCY_MS = 400;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchBookings(
  roomId: string,
  dates: string[]
): Promise<Record<string, Booking[]>> {
  await delay(MOCK_LATENCY_MS);

  const result: Record<string, Booking[]> = {};
  for (const date of dates) {
    result[date] = getMockBookings(date).filter((b) => b.roomId === roomId);
  }
  return result;
}