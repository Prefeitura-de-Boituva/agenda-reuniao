"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { RoomSchedule } from "@/types/schedule";
import {
  buildRoomSchedule,
  formatDateShort,
  getWeekDates,
  getWeekStart,
  parseDate,
  shiftDate,
  toISODate,
} from "@/lib/schedule";
import { ROOMS, getMockBookings } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function ScheduleGridContent() {
  const [selectedRoomId, setSelectedRoomId] = useState<string>(ROOMS[0].id);
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const today = new Date();
    return getWeekStart(today);
  });

  const selectedRoom = ROOMS.find((room) => room.id === selectedRoomId) ?? ROOMS[0];

  const schedule: RoomSchedule = useMemo(
    () => buildRoomSchedule(selectedRoom, weekStart, (date) => getMockBookings(date)),
    [selectedRoom, weekStart]
  );

  const weekDates = getWeekDates(weekStart);
  const todayISO = toISODate(new Date());

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5 text-primary" />
            <h1 className="text-h3 font-semibold text-neutral-900">Grade de Horários</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekStart((w) => shiftDate(w, -7))}
              className="rounded-lg border border-neutral-300 bg-white p-2 text-neutral-600 hover:bg-neutral-50 transition-colors duration-150"
              aria-label="Semana anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="px-3 py-2 text-caption font-medium text-neutral-700">
              {weekDates[0].toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
              {" – "}
              {weekDates[weekDates.length - 1].toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
              })}
            </div>
            <button
              onClick={() => setWeekStart((w) => shiftDate(w, 7))}
              className="rounded-lg border border-neutral-300 bg-white p-2 text-neutral-600 hover:bg-neutral-50 transition-colors duration-150"
              aria-label="Próxima semana"
            >
              <ChevronRight className="size-4" />
            </button>
            {toISODate(weekStart) !== toISODate(getWeekStart(new Date())) && (
              <button
                onClick={() => setWeekStart(getWeekStart(new Date()))}
                className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-caption font-medium text-primary-700 hover:bg-primary-100 transition-colors duration-150"
              >
                Hoje
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {ROOMS.map((room) => (
            <button
              key={room.id}
              onClick={() => setSelectedRoomId(room.id)}
              className={cn(
                "rounded-lg px-4 py-2 text-caption font-medium transition-colors duration-150",
                room.id === selectedRoomId
                  ? "bg-primary-500 text-white shadow-card"
                  : "border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50"
              )}
            >
              {room.name}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-card">
        <table className="w-full min-w-max border-collapse">
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="sticky left-0 bg-white px-4 py-3 text-left text-caption font-semibold text-neutral-500">
                Horário
              </th>
              {schedule.dates.map((date) => {
                const dayStart = parseDate(date);
                const isToday = date === todayISO;
                return (
                  <th
                    key={date}
                    className={cn(
                      "px-4 py-3 text-left text-caption font-semibold",
                      isToday ? "text-primary" : "text-neutral-700"
                    )}
                  >
                    <span className="capitalize">{formatDateShort(dayStart)}</span>
                    {isToday && <span className="ml-1 text-tiny font-normal">(hoje)</span>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {schedule.slotsByDate[schedule.dates[0]].map((_, index) => {
              const startTime = schedule.slotsByDate[schedule.dates[0]][index].startTime;
              const endTime = schedule.slotsByDate[schedule.dates[0]][index].endTime;
              return (
                <tr key={startTime} className="border-b border-neutral-100 last:border-b-0">
                  <td className="sticky left-0 bg-white px-4 py-2 whitespace-nowrap text-body tabular-nums text-neutral-600">
                    {startTime} – {endTime}
                  </td>
                  {schedule.dates.map((date) => {
                    const slot = schedule.slotsByDate[date][index];
                    return (
                      <td key={date} className="px-2 py-1.5">
                        <div
                          className={cn(
                            "flex h-12 items-center rounded-lg border px-2 text-caption",
                            slot.status === "available" &&
                              "border-success-200 bg-success-50 text-success-700",
                            slot.status === "past" &&
                              "border-neutral-200 bg-neutral-100 text-neutral-400",
                            slot.status === "booked" &&
                              "border-danger-200 bg-danger-50 text-danger-700"
                          )}
                        >
                          {slot.status === "booked" && slot.booking && (
                            <span className="flex min-w-0 flex-col leading-tight">
                              <span className="truncate font-medium">{slot.booking.name}</span>
                              <span className="truncate">{slot.booking.department}</span>
                            </span>
                          )}
                          {slot.status === "available" && <span className="mx-auto">—</span>}
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
          <span className="size-3 rounded-full bg-success-500" />
          <span className="text-tiny text-neutral-600">Disponível</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-danger-500" />
          <span className="text-tiny text-neutral-600">Ocupado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-neutral-400" />
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