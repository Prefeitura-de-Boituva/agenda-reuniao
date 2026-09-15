import React from "react";

export interface AgendaItem {
  id: string;
  title: string;
  time: string; // e.g., "09:00 - 10:00"
  description?: string;
}

/**
 * Simple agenda placeholder for a given "sala".
 *
 * In a real app this would fetch data per‑room, but for the purpose of the
 * exercise we just render a static list that changes its heading based on the
 * `selectedSala` prop.
 */
export const Agenda: React.FC<{
  selectedSala: string;
}> = ({ selectedSala }) => {
  // Dummy data – each sala shows the same three items just for demo.
  const items: AgendaItem[] = [
    { id: "1", title: "Reunião de Planejamento", time: "09:00 - 10:00" },
    { id: "2", title: "Apresentação de Projeto", time: "11:00 - 12:00" },
    { id: "3", title: "Feedback de Sprint", time: "14:00 - 15:00" },
  ];

  return (
    <section className="flex flex-col gap-4 rounded-xl bg-white p-6 shadow-card border border-neutral-200 max-w-md">
      <h2 className="text-h3 font-semibold text-neutral-900">
        Agenda da {selectedSala}
      </h2>
      <ul className="flex flex-col gap-2">
        {items.map((it) => (
          <li key={it.id} className="p-3 border border-neutral-200 rounded-lg">
            <p className="font-medium text-neutral-900">{it.title}</p>
            <p className="text-sm text-neutral-600">{it.time}</p>
            {it.description && <p className="text-xs text-neutral-500">{it.description}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
};

export default Agenda;
