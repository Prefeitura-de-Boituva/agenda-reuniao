"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toISODate, parseDate, shiftDate, formatDate } from "@/lib/schedule";
import { cn } from "@/lib/utils";

/**
 * DateSelector – permite navegar entre dias e escolher uma data via input
 *
 * • `selectedDate` – string ISO (YYYY-MM-DD) controlada pelo pai
 * • `onDateChange` – callback para atualizar a data
 * • Visualmente desabilita datas anteriores a hoje (input `min` + botão anterior desabilitado)
 */
export const DateSelector: React.FC<{
  selectedDate: string;
  onDateChange: (date: string) => void;
  className?: string;
}> = ({ selectedDate, onDateChange, className }) => {
  const todayISO = toISODate(new Date());

  // Handlers for navigation buttons
  const goPrev = () => {
    const prev = shiftDate(parseDate(selectedDate), -1);
    onDateChange(toISODate(prev));
  };
  const goNext = () => {
    const next = shiftDate(parseDate(selectedDate), 1);
    onDateChange(toISODate(next));
  };

  // Handler for direct input change (guard against past dates)
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value >= todayISO) {
      onDateChange(value);
    }
  };

  const isPrevDisabled = selectedDate <= todayISO; // cannot go before today

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <label htmlFor="date-selector-input" className="sr-only">
        Selecionar data
      </label>
      <button
        type="button"
        onClick={goPrev}
        disabled={isPrevDisabled}
        aria-label="Dia anterior"
        className={cn(
          "rounded-lg border border-neutral-300 bg-white p-2 text-neutral-600 hover:bg-neutral-50",
          isPrevDisabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>

      <input
        id="date-selector-input"
        type="date"
        value={selectedDate}
        min={todayISO}
        onChange={onInputChange}
        aria-label="Selecionar data da reunião"
        className={cn(
          "flex h-10 items-center rounded-lg border border-neutral-300 bg-white px-3 text-body text-neutral-900",
          "focus:outline-none focus:ring-2 focus:ring-primary-100"
        )}
      />

      <button
        type="button"
        onClick={goNext}
        aria-label="Próximo dia"
        className={cn(
          "rounded-lg border border-neutral-300 bg-white p-2 text-neutral-600 hover:bg-neutral-50",
          "focus:outline-none focus:ring-2 focus:ring-primary-100"
        )}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>

      <span className="text-body text-neutral-700">
        {formatDate(parseDate(selectedDate))}
      </span>
    </div>
  );
};

export default DateSelector;
