"use client";
import { useEffect, useState } from "react";
import SalaTabs from "@/components/SalaTabs";
import DateSelector from "@/components/DateSelector";
import { buttonClasses } from "@/components/ui";
import { BrandLogo } from "@/components/layout";
import { applyRoomTint } from "@/lib/room-colors";
import { ROOMS } from "@/lib/rooms";
import { useDayBookings } from "@/lib/use-day-bookings";
import { formatDate, parseDate, toISODate } from "@/lib/schedule";
import Link from "next/link";
import Agenda from "@/components/Agenda";

const SALA_BY_ROOM_ID: Record<string, string> = Object.fromEntries(
  ROOMS.map((room) => [room.id, room.name])
);

interface StatCardProps {
  label: string;
  value: string;
  detail: string;
}

function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-card border border-neutral-200">
      <h2 className="text-h4 font-semibold text-neutral-900 mb-1">{label}</h2>
      <p className="text-h1 font-bold text-primary">{value}</p>
      <p className="mt-1 text-xs text-neutral-600">{detail}</p>
    </div>
  );
}

export default function Home() {
  const [selectedRoomId, setSelectedRoomId] = useState<string>(ROOMS[0].id);
  const [selectedDate, setSelectedDate] = useState<string>(toISODate(new Date()));
  const selectedSala = SALA_BY_ROOM_ID[selectedRoomId] ?? ROOMS[0].name;

  const { stats, bookingsByRoom, isReady } = useDayBookings(selectedDate);

  // Apply light background tint to whole page based on selected room
  useEffect(() => {
    applyRoomTint(selectedRoomId);
  }, [selectedRoomId]);

  const roomStat = stats.byRoom[selectedRoomId];
  // Sem resposta da API ainda não se mostra número nenhum: os blocos ficam em
  // traço em vez de arriscar um total que não vem do banco.
  const loadingDetail = `Carregando dados de ${formatDate(parseDate(selectedDate))}...`;

  return (
    <div className="flex flex-col gap-8 py-8">
      <section className="flex flex-col gap-2">
        <h1 className="text-h2 font-bold text-neutral-900 flex items-center gap-2">
          <BrandLogo />
          Agenda de Reuniões
        </h1>
        <p className="text-body text-neutral-600">
          Gerencie as salas e horários de reunião da Prefeitura de Boituva.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Salas Disponíveis"
          value={String(stats.roomCount)}
          detail={ROOMS.map((room) => room.name).join(", ")}
        />
        <StatCard
          label="Reuniões Hoje"
          value={isReady ? String(stats.totalBookings) : "—"}
          detail={isReady ? `${selectedSala}: ${roomStat?.bookingCount ?? 0}` : loadingDetail}
        />
        <StatCard
          label="Horários Ocupados"
          value={isReady ? String(stats.totalOccupiedSlots) : "—"}
          detail={
            isReady
              ? `${selectedSala}: ${roomStat?.occupiedSlots ?? 0} de ${roomStat?.totalSlots ?? 0}`
              : loadingDetail
          }
        />
      </section>

      <SalaTabs
        selectedSala={selectedSala}
        onSelect={(sala) => {
          const room = ROOMS.find((r) => r.name === sala);
          if (room) setSelectedRoomId(room.id);
        }}
        className="mb-4"
      />
      <div className="flex flex-wrap items-end gap-4">
        <DateSelector
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          className="flex-1"
        />
        <Link
          href={`/grade?date=${selectedDate}&room=${selectedRoomId}`}
          className={buttonClasses({ variant: "primary", size: "md" })}
        >
          Ver na Grade de Horários
        </Link>
      </div>

      <Agenda
        selectedSala={selectedSala}
        bookings={bookingsByRoom[selectedRoomId] ?? []}
        isLoading={!isReady}
      />
    </div>
  );
}
