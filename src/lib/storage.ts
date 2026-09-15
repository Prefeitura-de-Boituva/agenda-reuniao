import type { Booking } from "@/types/schedule";

export interface BookingOverrideEntry {
  upserts: Booking[];
  deletedIds: string[];
}

export type RoomOverrides = Record<string, BookingOverrideEntry>;

export interface PersistedGradeState {
  overrides: Record<string, RoomOverrides>;
  selectedRoomId: string;
  weekStartIso: string;
}

const STORAGE_KEY = "agenda-reuniao:grade:v1";

export function loadGradeState(): PersistedGradeState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as unknown;

    if (
      typeof data !== "object" ||
      data === null ||
      typeof (data as Record<string, unknown>).selectedRoomId !== "string" ||
      typeof (data as Record<string, unknown>).weekStartIso !== "string" ||
      typeof (data as Record<string, unknown>).overrides !== "object" ||
      (data as Record<string, unknown>).overrides === null
    ) {
      return null;
    }

    return data as PersistedGradeState;
  } catch {
    return null;
  }
}

export function saveGradeState(state: PersistedGradeState): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage indisponível ou cheio — ignora silenciosamente
  }
}