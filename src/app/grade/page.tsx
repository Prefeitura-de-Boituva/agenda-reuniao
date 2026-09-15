"use client";

import { useEffect, useMemo, useState } from "react";
import { ScheduleGrid } from "@/components/schedule";
import { fetchBookings } from "@/lib/bookings";
import { getWeekDates, getWeekStart, shiftDate, toISODate } from "@/lib/schedule";
import type { Booking } from "@/types/schedule";
import { ROOMS } from "@/lib/mock-data";

interface OverrideEntry {
  upserts: Booking[];
  deletedIds: string[];
}

type RoomOverrides = Record<string, OverrideEntry>;

export default function GradePage() {
  const [selectedRoomId, setSelectedRoomId] = useState<string>(ROOMS[0].id);
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [fetched, setFetched] = useState<Record<string, Record<string, Booking[]>>>({});
  const [overrides, setOverrides] = useState<Record<string, RoomOverrides>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
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
  }, [selectedRoomId, weekStart]);

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
    />
  );
}