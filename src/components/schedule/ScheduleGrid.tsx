"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { DaySchedule } from "@/types/schedule";
import {
  buildDaySchedule,
  formatDate,
  getNextWeekday,
  getPreviousWeekday,
  toISODate,
} from "@/lib/schedule";
import { ROOMS, getMockBookings } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function ScheduleGridContent() {
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const today = new Date();
    return today.getDay() === 0 || today.getDay() === 6 ? getNextWeekday(today) : today;
  });

  const schedule: DaySchedule = useMemo(() => {
    const date = toISODate(selectedDate);
    const bookings = getMockBookings(date);
    return buildDaySchedule(date, ROOMS, bookings);
  }, [selectedDate]);

  const slotRows = schedule.rooms[0]
    ? schedule.slotsByRoom[schedule.rooms[0].id]
    : [];

  const today = new Date();
  const isToday =
    toISODate(selectedDate) === toISODate(today);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-5 text-primary" />
          <h1 className="text-h3 font-semibold text-neutral-900">Grade de Horários</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate((d) => getPreviousWeekday(d))}
            className="rounded-lg border border-neutral-300 bg-white p-2 text-neutral-600 hover:bg-neutral-50 transition-colors duration-150"
            aria-label="Dia anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="px-3 py-2 text-caption font-medium capitalize text-neutral-700">
            {formatDate(selectedDate)}
          </div>
          <button
            onClick={() => setSelectedDate((d) => getNextWeekday(d))}
            className="rounded-lg border border-neutral-300 bg-white p-2 text-neutral-600 hover:bg-neutral-50 transition-colors duration-150"
            aria-label="Próximo dia"
          >
            <ChevronRight className="size-4" />
          </button>
          {!isToday && (
            <button
              onClick={() => {
                const todayDate = new Date();
                setSelectedDate(
                  todayDate.getDay() === 0 || todayDate.getDay() === 6
                    ? getNextWeekday(todayDate)
                    : todayDate
                );
              }}
              className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-caption font-medium text-primary-700 hover:bg-primary-100 transition-colors duration-150"
            >
              Hoje
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-card">
        <table className="w-full min-w-max border-collapse">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="sticky left-0 bg-white px-4 py-3 text-left text-caption font-semibold text-neutral-500">
                Horário
              </th>
              {schedule.rooms.map((room) => (
                <th
                  key={room.id}
                  className="px-4 py-3 text-left text-caption font-semibold text-neutral-700"
                >
                  {room.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slotRows.map((_, index) => {
              const startTime = slotRows[index].startTime;
              const endTime = slotRows[index].endTime;
              return (
                <tr
                  key={startTime}
                  className="border-b border-neutral-100 last:border-b-0"
                >
                  <td className="sticky left-0 bg-white px-4 py-2 whitespace-nowrap text-body tabular-nums text-neutral-600">
                    {startTime} – {endTime}
                  </td>
                  {schedule.rooms.map((room) => {
                    const slot = schedule.slotsByRoom[room.id][index];
                    const isBookingStart = slot.booking?.startTime === startTime;
                    return (
                      <td key={room.id} className="px-2 py-1.5">
                        <div
                          className={cn(
                            "flex h-10 items-center rounded-lg border px-3 text-caption",
                            slot.status === "available" &&
                              "border-success-200 bg-success-50 text-success-700",
                            slot.status === "past" &&
                              "border-neutral-200 bg-neutral-100 text-neutral-400",
                            slot.status === "booked" &&
                              "border-danger-200 bg-danger-50 text-danger-700"
                          )}
                          title={
                            isBookingStart && slot.booking
                              ? `${slot.booking.name} · ${slot.booking.department}`
                              : undefined
                          }
                        >
                          {slot.status === "booked" && isBookingStart && slot.booking && (
                            <span className="truncate">
                              {slot.booking.name}
                              <span className="hidden text-danger-700/70 lg:inline">
                                {" "}
                                · {slot.booking.department}
                              </span>
                            </span>
                          )}
                          {slot.status === "available" && (
                            <span className="mx-auto">Disponível</span>
                          )}
                          {slot.status === "past" && <span className="mx-auto">—</span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-success-200 bg-success-50" />
          <span className="text-tiny text-neutral-600">Disponível</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-danger-200 bg-danger-50" />
          <span className="text-tiny text-neutral-600">Ocupado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-neutral-200 bg-neutral-100" />
          <span className="text-tiny text-neutral-600">Horário já passado</span>
        </div>
      </div>
    </div>
  );
}

export function ScheduleGrid({ className }: { className?: string }) {
  return (
    <div className={className}>
      <ScheduleGridContent />
    </div>
  );
}

export default ScheduleGrid;