"use client";

/* eslint-disable react-hooks/set-state-in-effect -- os effects abaixo sincronizam
   estado persistido (localStorage), parâmetros de URL e o loading do fetch; cada
   um roda após a hidratação de propósito e refatorá-los mudaria o comportamento. */

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ScheduleGrid } from "@/components/schedule";
import { fetchBookings } from "@/lib/bookings";
import { getWeekDates, getWeekStart, parseDate, shiftDate, toISODate } from "@/lib/schedule";
import { loadGradeState, saveGradeState } from "@/lib/storage";
import type { Booking } from "@/types/schedule";
import { ROOMS } from "@/lib/rooms";
import { applyRoomTint } from "@/lib/room-colors";

function GradeContent() {
  const searchParams = useSearchParams();
  const dateParam = searchParams?.get("date");
  const roomParam = searchParams?.get("room");

  const [selectedRoomId, setSelectedRoomId] = useState<string>(ROOMS[0].id);
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [fetched, setFetched] = useState<Record<string, Record<string, Booking[]>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [highlightedDate, setHighlightedDate] = useState<string | undefined>(dateParam ?? undefined);

  useEffect(() => {
    const saved = loadGradeState();
    if (saved) {
      setSelectedRoomId(saved.selectedRoomId);
      setWeekStart(parseDate(saved.weekStartIso));
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

  // Light background tint per room, aplicado ao body
  useEffect(() => {
    applyRoomTint(selectedRoomId);
  }, [selectedRoomId]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    setIsLoading(true);
    const dates = getWeekDates(weekStart).map(toISODate);
    fetchBookings(selectedRoomId, dates)
      .then((result) => {
        if (cancelled) return;
        setFetched((prev) => ({
          ...prev,
          [selectedRoomId]: { ...prev[selectedRoomId], ...result },
        }));
      })
      .catch(() => {
        // `fetchBookings` lança quando a API falha. A grade mantém aqui o
        // comportamento anterior (semana vazia, sem aviso): quem sinaliza a falha
        // ao usuário é a tela inicial, onde os blocos de número dariam a entender
        // que o dia está livre.
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRoomId, weekStart, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    saveGradeState({ selectedRoomId, weekStartIso: toISODate(weekStart) });
  }, [selectedRoomId, weekStart, hydrated]);

  const bookings = useMemo(() => {
    const roomFetched = fetched[selectedRoomId] ?? {};
    return Object.fromEntries(
      Object.entries(roomFetched).map(([date, list]) => [
        date,
        [...list].sort((a, b) => a.startTime.localeCompare(b.startTime)),
      ])
    );
  }, [fetched, selectedRoomId]);

  const handleSelectRoom = (roomId: string) => setSelectedRoomId(roomId);
  const handleNavigateWeek = (days: number) => setWeekStart((prev) => shiftDate(prev, days));
  const handleGoToCurrentWeek = () => setWeekStart(getWeekStart(new Date()));

  /**
   * Criação e edição já foram confirmadas pelo servidor quando chegam aqui, então
   * a resposta é apenas mesclada no estado buscado: a célula atualiza na hora sem
   * nova requisição e sem uma cópia local que poderia divergir do banco.
   */
  const mergeBooking = (booking: Booking) =>
    setFetched((prev) => {
      const roomFetched = prev[booking.roomId] ?? {};
      const doDia = (roomFetched[booking.date] ?? []).filter((b) => b.id !== booking.id);
      return {
        ...prev,
        [booking.roomId]: { ...roomFetched, [booking.date]: [...doDia, booking] },
      };
    });

  const handleDeleteBooking = (bookingId: string, date: string) =>
    setFetched((prev) => {
      const roomFetched = prev[selectedRoomId] ?? {};
      return {
        ...prev,
        [selectedRoomId]: {
          ...roomFetched,
          [date]: (roomFetched[date] ?? []).filter((b) => b.id !== bookingId),
        },
      };
    });

  return (
    <div className="min-h-screen w-full">
      <ScheduleGrid
        bookings={bookings}
        isLoading={isLoading}
        selectedRoomId={selectedRoomId}
        onSelectRoom={handleSelectRoom}
        weekStart={weekStart}
        onNavigateWeek={handleNavigateWeek}
        onGoToCurrentWeek={handleGoToCurrentWeek}
        onCreateBooking={mergeBooking}
        onUpdateBooking={mergeBooking}
        onDeleteBooking={handleDeleteBooking}
        highlightedDate={highlightedDate}
      />
    </div>
  );
}

export default function GradePage() {
  return (
    <Suspense fallback={<p className="p-8 text-center text-neutral-600">Carregando grade...</p>}>
      <GradeContent />
    </Suspense>
  );
}
