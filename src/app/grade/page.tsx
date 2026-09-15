"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ScheduleGrid } from "@/components/schedule";
import { fetchBookings } from "@/lib/bookings";
import { getWeekDates, getWeekStart, parseDate, shiftDate, toISODate } from "@/lib/schedule";
import { loadGradeState, saveGradeState } from "@/lib/storage";
import type { Booking } from "@/types/schedule";
import { ROOMS } from "@/lib/mock-data";
import type { RoomOverrides } from "@/lib/storage";

function GradeContent() {
  const searchParams = useSearchParams();
  const dateParam = searchParams?.get("date");
  const roomParam = searchParams?.get("room");
  
  const [selectedRoomId, setSelectedRoomId] = useState<string>(ROOMS[0].id);
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [fetched, setFetched] = useState<Record<string, Record<string, Booking[]>>>({});
  const [overrides, setOverrides] = useState<Record<string, RoomOverrides>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [highlightedDate, setHighlightedDate] = useState<string | undefined>(dateParam ?? undefined);

  useEffect(() => {
    const saved = loadGradeState();
    if (saved) {
      setSelectedRoomId(saved.selectedRoomId);
      setWeekStart(parseDate(saved.weekStartIso));
      setOverrides(saved.overrides);
    }
    setHydrated(true);
  }, []);

  // Apply date param if present and valid
  useEffect(() => {
    if (!hydrated || !dateParam) return;
    try {
      const parsed = parseDate(dateParam);
      if (!isNaN(parsed.getTime())) {
        const newWeekStart = getWeekStart(parsed);
        setWeekStart(newWeekStart);
        setHighlightedDate(dateParam);
      }
    } catch {
      // Invalid date param, ignore
    }
  }, [hydrated, dateParam]);

  // Apply room param if present and valid
  useEffect(() => {
    if (!hydrated || !roomParam) return;
    if (ROOMS.some((r) => r.id === roomParam)) {
      setSelectedRoomId(roomParam);
    }
  }, [hydrated, roomParam]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    setIsLoading(true);
    const dates = getWeekDates(weekStart).map(toISODate);
    fetchBookings(selectedRoomId, dates).then((result) => {
      if (cancelled) return;
      setFetched((prev) => ({
        ...prev,
        [selectedRoomId]: { ...prev[selectedRoomId], ...result },
      }));
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedRoomId, weekStart, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveGradeState({ overrides, selectedRoomId, weekStartIso: toISODate(weekStart) });
  }, [overrides, selectedRoomId, weekStart, hydrated]);

  const bookings = useMemo(() => {
    const roomFetched = fetched[selectedRoomId] ?? {};
    const roomOverrides = overrides[selectedRoomId] ?? {};
    const allDates = new Set([...Object.keys(roomFetched), ...Object.keys(roomOverrides)]);

    const merged: Record<string, Booking[]> = {};
    for (const date of allDates) {
      const entry = roomOverrides[date] ?? { upserts: [], deletedIds: [] };
      const upsertIds = new Set(entry.upserts.map((b) => b.id));
      merged[date] = [
        ...(roomFetched[date] ?? []).filter(
          (b) => !entry.deletedIds.includes(b.id) && !upsertIds.has(b.id)
        ),
        ...entry.upserts,
      ].sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return merged;
  }, [fetched, overrides, selectedRoomId]);

  const handleSelectRoom = (roomId: string) => setSelectedRoomId(roomId);
  const handleNavigateWeek = (days: number) => setWeekStart((prev) => shiftDate(prev, days));
  const handleGoToCurrentWeek = () => setWeekStart(getWeekStart(new Date()));

  const upsertOverride = (booking: Booking) =>
    setOverrides((prev) => {
      const roomOverrides = prev[booking.roomId] ?? {};
      const entry = roomOverrides[booking.date] ?? { upserts: [], deletedIds: [] };
      return {
        ...prev,
        [booking.roomId]: {
          ...roomOverrides,
          [booking.date]: {
            upserts: [...entry.upserts.filter((b) => b.id !== booking.id), booking],
            deletedIds: entry.deletedIds.filter((id) => id !== booking.id),
          },
        },
      };
    });

  const handleCreateBooking = (booking: Booking) => upsertOverride(booking);
  const handleUpdateBooking = (booking: Booking) => upsertOverride(booking);

  const handleDeleteBooking = (bookingId: string, date: string) => {
    setOverrides((prev) => {
      const roomOverrides = prev[selectedRoomId] ?? {};
      const entry = roomOverrides[date] ?? { upserts: [], deletedIds: [] };
      return {
        ...prev,
        [selectedRoomId]: {
          ...roomOverrides,
          [date]: {
            upserts: entry.upserts.filter((b) => b.id !== bookingId),
            deletedIds: [...entry.deletedIds, bookingId],
          },
        },
      };
    });
  };

  return (
    <ScheduleGrid
      bookings={bookings}
      isLoading={isLoading}
      selectedRoomId={selectedRoomId}
      onSelectRoom={handleSelectRoom}
      weekStart={weekStart}
      onNavigateWeek={handleNavigateWeek}
      onGoToCurrentWeek={handleGoToCurrentWeek}
      onCreateBooking={handleCreateBooking}
      onUpdateBooking={handleUpdateBooking}
      onDeleteBooking={handleDeleteBooking}
      highlightedDate={highlightedDate}
    />
  );
}

export default function GradePage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-neutral-600">Carregando grade...</p>}>
      <GradeContent />
    </Suspense>
  );
}