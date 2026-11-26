"use client";

/* eslint-disable react-hooks/set-state-in-effect -- o efeito de busca abre o
   `isLoading` no próprio corpo, antes do `fetch`, e o tint da sala precisa tocar o
   `<body>` depois da montagem; nenhum dos dois pode virar derivação de render. */

import { useEffect, useMemo, useState, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ScheduleGrid } from "@/components/schedule";
import { fetchBookings } from "@/lib/bookings";
import { getWeekDates, getWeekStart, parseDate, shiftDate, toISODate } from "@/lib/schedule";
import type { Booking } from "@/types/schedule";
import { ROOMS } from "@/lib/rooms";
import { applyRoomTint } from "@/lib/room-colors";

/** `?room=` só vale se for uma sala conhecida; qualquer outra coisa cai na primeira. */
function salaDaUrl(param: string | null): string {
  return ROOMS.find((room) => room.id === param)?.id ?? ROOMS[0].id;
}

/**
 * `?date=` aceitável: "YYYY-MM-DD" que o relógio da agenda consiga interpretar.
 * `parseDate` lança para formato inválido e rola o mês para frente para datas
 * impossíveis, então a checagem é regex + `Date` válido.
 */
function dataDaUrl(param: string | null): string | undefined {
  if (!param || !/^\d{4}-\d{2}-\d{2}$/.test(param)) return undefined;
  try {
    return Number.isNaN(parseDate(param).getTime()) ? undefined : param;
  } catch {
    return undefined;
  }
}

function GradeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selectedRoomId = salaDaUrl(searchParams?.get("room") ?? null);
  const highlightedDate = dataDaUrl(searchParams?.get("date") ?? null);
  /** Dia que ancora a semana mostrada: o da URL, ou hoje quando a URL não informa. */
  const anchorDate = highlightedDate ?? toISODate(new Date());
  const weekStart = useMemo(() => getWeekStart(parseDate(anchorDate)), [anchorDate]);

  const [fetched, setFetched] = useState<Record<string, Record<string, Booking[]>>>({});
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Sala e semana vivem na URL: `router.replace` escreve `?room=`/`?date=` sem
   * empilhar entradas no histórico e sem recarregar a página. Com o endereço como
   * única fonte, recarregar, compartilhar o link e voltar para a grade reabrem a
   * grade que estava na tela — o `localStorage` de navegação era uma segunda fonte
   * que perdia a disputa para a URL justamente no reload.
   */
  const abrir = (date: string, roomId: string) => {
    const params = new URLSearchParams(searchParams?.toString());
    params.set("date", date);
    params.set("room", roomId);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Light background tint per room, aplicado ao body
  useEffect(() => {
    applyRoomTint(selectedRoomId);
  }, [selectedRoomId]);

  useEffect(() => {
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
  }, [selectedRoomId, weekStart]);

  const bookings = useMemo(() => {
    const roomFetched = fetched[selectedRoomId] ?? {};
    return Object.fromEntries(
      Object.entries(roomFetched).map(([date, list]) => [
        date,
        [...list].sort((a, b) => a.startTime.localeCompare(b.startTime)),
      ])
    );
  }, [fetched, selectedRoomId]);

  const handleSelectRoom = (roomId: string) => abrir(anchorDate, roomId);
  /**
   * Trocar de semana desloca o próprio dia âncora, e não só o início da semana:
   * assim o `?date=` continua sendo um dia da semana exibida e o reload reabre nela.
   */
  const handleNavigateWeek = (days: number) =>
    abrir(toISODate(shiftDate(parseDate(anchorDate), days)), selectedRoomId);
  const handleGoToCurrentWeek = () => abrir(toISODate(new Date()), selectedRoomId);

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
