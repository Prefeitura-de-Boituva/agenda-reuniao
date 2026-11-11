"use client";
import { useEffect, useState } from "react";
import SalaTabs from "@/components/SalaTabs";
import DateSelector from "@/components/DateSelector";
import { buttonClasses } from "@/components/ui";
import { BrandLogo } from "@/components/layout";
import { applyRoomTint } from "@/lib/room-colors";
import { toISODate } from "@/lib/schedule";
import Link from "next/link";
import Agenda from "@/components/Agenda";

const ROOM_BY_SALA: Record<string, string> = {
  "Sala Azul": "sala-azul",
  "Sala Verde": "sala-verde",
  "Sala Amarela": "sala-amarela",
};

export default function Home() {
  const [selectedSala, setSelectedSala] = useState<string>("Sala Azul");
  const [selectedDate, setSelectedDate] = useState<string>(toISODate(new Date()));

  // Apply light background tint to whole page based on selected room
  useEffect(() => {
    applyRoomTint(ROOM_BY_SALA[selectedSala] ?? "sala-azul");
  }, [selectedSala]);
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
        <div className="rounded-xl bg-white p-5 shadow-card border border-neutral-200">
          <h2 className="text-h4 font-semibold text-neutral-900 mb-1">
            Salas Disponíveis
          </h2>
          <p className="text-h1 font-bold text-primary">5</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-card border border-neutral-200">
          <h2 className="text-h4 font-semibold text-neutral-900 mb-1">
            Reuniões Hoje
          </h2>
          <p className="text-h1 font-bold text-primary">8</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-card border border-neutral-200">
          <h2 className="text-h4 font-semibold text-neutral-900 mb-1">
            Horários Ocupados
          </h2>
          <p className="text-h1 font-bold text-primary">12</p>
        </div>
      </section>

      <SalaTabs selectedSala={selectedSala} onSelect={setSelectedSala} className="mb-4" />
      <div className="flex flex-wrap items-end gap-4">
        <DateSelector selectedDate={selectedDate} onDateChange={setSelectedDate} className="flex-1" />
        <Link href={`/grade?date=${selectedDate}&room=${ROOM_BY_SALA[selectedSala]}`} className={buttonClasses({ variant: "primary", size: "md" })}>
          Ver na Grade de Horários
        </Link>
      </div>

      <Agenda selectedSala={selectedSala} />
    </div>
  );
}
