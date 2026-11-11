import React from "react";
import type { Booking } from "@/types/schedule";

/**
 * Agenda da sala selecionada: as mesmas reservas que a Grade de Horários mostra
 * para aquela sala naquele dia, já ordenadas por horário de início.
 */
export const Agenda: React.FC<{
  selectedSala: string;
  bookings: Booking[];
  isLoading: boolean;
}> = ({ selectedSala, bookings, isLoading }) => (
  <section className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-card border border-neutral-200 max-w-md">
    <h2 className="text-h3 font-semibold text-neutral-900">Agenda da {selectedSala}</h2>
    {isLoading ? (
      <p className="text-sm text-neutral-600">Carregando agenda...</p>
    ) : bookings.length === 0 ? (
      <p className="text-sm text-neutral-600">Nenhuma reunião agendada.</p>
    ) : (
      <ul className="flex flex-col gap-2">
        {bookings.map((b) => (
          <li key={b.id} className="p-3 border border-neutral-200 rounded-lg">
            <p className="font-medium text-neutral-900">{b.name}</p>
            <p className="text-sm text-neutral-600">
              {b.startTime} - {b.endTime}
            </p>
            <p className="text-xs text-neutral-500">{b.department}</p>
          </li>
        ))}
      </ul>
    )}
  </section>
);

export default Agenda;
