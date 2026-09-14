"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import type { Booking, RoomSchedule } from "@/types/schedule";
import {
  buildRoomSchedule,
  generateTimeSlots,
  formatDateShort,
  getWeekDates,
  getWeekStart,
  parseDate,
  shiftDate,
  SLOT_MINUTES,
  toISODate,
} from "@/lib/schedule";
import { ROOMS, getMockBookings } from "@/lib/mock-data";
import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@/components/ui";
import { cn } from "@/lib/utils";

function seedBookingsForWeek(start: Date): Record<string, Booking[]> {
  const result: Record<string, Booking[]> = {};
  for (const date of getWeekDates(start)) {
    const iso = toISODate(date);
    result[iso] = getMockBookings(iso);
  }
  return result;
}

function computeEndTime(startTime: string, durationBlocks: number): string {
  const [hour, minute] = startTime.split(":").map(Number);
  const totalMinutes = hour * 60 + minute + durationBlocks * SLOT_MINUTES - 1;
  const endHour = Math.floor(totalMinutes / 60);
  const endMinute = totalMinutes % 60;
  return `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
}

const SELECT_CLASSES =
  "flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-body text-neutral-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-100 transition-colors duration-150";

interface EditModalProps {
  booking: Booking;
  onSave: (updated: Booking) => void;
  onClose: () => void;
}

function EditModal({ booking, onSave, onClose }: EditModalProps) {
  const slots = generateTimeSlots();
  const [name, setName] = useState(booking.name);
  const [department, setDepartment] = useState(booking.department);
  const [startTime, setStartTime] = useState(booking.startTime);

  const [initialBlocks] = useState(() => {
    const [startHour, startMinute] = booking.startTime.split(":").map(Number);
    const [endHour, endMinute] = booking.endTime.split(":").map(Number);
    const startTotal = startHour * 60 + startMinute;
    const endTotal = endHour * 60 + endMinute + 1;
    return Math.round((endTotal - startTotal) / SLOT_MINUTES);
  });
  const [durationBlocks, setDurationBlocks] = useState(initialBlocks);

  const startIndex = slots.findIndex((s) => s.startTime === startTime);
  const maxBlocks = 18 - startIndex;
  const durationOptions = [1, 2, 3, 4, 5, 6].filter((blocks) => blocks <= maxBlocks);

  const availableStarts = slots.filter((_, index) => index + durationBlocks <= 18);
  const endTime = computeEndTime(startTime, durationBlocks);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSave({
      ...booking,
      name,
      department,
      startTime,
      endTime,
    });
  };

  return (
    <Modal open onClose={onClose}>
      <ModalContent>
        <ModalHeader>Editar Agendamento</ModalHeader>
        <form onSubmit={handleSubmit}>
          <ModalBody className="flex flex-col gap-4">
            <Input
              label="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Departamento"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              required
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-caption font-medium text-neutral-700">
                Horário de início
              </label>
              <select
                className={SELECT_CLASSES}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              >
                {availableStarts.map((slot) => (
                  <option key={slot.startTime} value={slot.startTime}>
                    {slot.startTime}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-caption font-medium text-neutral-700">
                Duração
              </label>
              <select
                className={SELECT_CLASSES}
                value={durationBlocks}
                onChange={(e) => setDurationBlocks(Number(e.target.value))}
              >
                {durationOptions.map((blocks) => (
                  <option key={blocks} value={blocks}>
                    {blocks * 30} min ({startTime} – {computeEndTime(startTime, blocks)})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-tiny text-neutral-500">
              Novo horário: {startTime} – {endTime}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit">Salvar</Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}

interface DeleteModalProps {
  booking: Booking;
  onConfirm: () => void;
  onClose: () => void;
}

function DeleteModal({ booking, onConfirm, onClose }: DeleteModalProps) {
  return (
    <Modal open onClose={onClose}>
      <ModalContent>
        <ModalHeader>Excluir Agendamento</ModalHeader>
        <ModalBody>
          Tem certeza que deseja excluir o agendamento de{" "}
          <strong>{booking.name}</strong> ({booking.department}) das{" "}
          {booking.startTime} às {booking.endTime}?
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Excluir
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function ScheduleGridContent() {
  const [selectedRoomId, setSelectedRoomId] = useState<string>(ROOMS[0].id);
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [mockBookings, setMockBookings] = useState<Record<string, Booking[]>>(() =>
    seedBookingsForWeek(getWeekStart(new Date()))
  );
  const [editTarget, setEditTarget] = useState<{ booking: Booking; date: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ booking: Booking; date: string } | null>(null);

  const selectedRoom = ROOMS.find((room) => room.id === selectedRoomId) ?? ROOMS[0];

  const schedule: RoomSchedule = useMemo(
    () =>
      buildRoomSchedule(selectedRoom, weekStart, (date) => mockBookings[date] ?? []),
    [selectedRoom, weekStart, mockBookings]
  );

  const weekDates = getWeekDates(weekStart);
  const todayISO = toISODate(new Date());

  const navigateWeek = (days: number) => {
    const next = shiftDate(weekStart, days);
    setMockBookings((prev) => {
      const merged = { ...prev };
      for (const date of getWeekDates(next)) {
        const iso = toISODate(date);
        if (!merged[iso]) merged[iso] = getMockBookings(iso);
      }
      return merged;
    });
    setWeekStart(next);
  };

  const goToCurrentWeek = () => {
    const next = getWeekStart(new Date());
    setMockBookings((prev) => {
      const merged = { ...prev };
      for (const date of getWeekDates(next)) {
        const iso = toISODate(date);
        if (!merged[iso]) merged[iso] = getMockBookings(iso);
      }
      return merged;
    });
    setWeekStart(next);
  };

  const handleEditSave = (date: string, updated: Booking) => {
    setMockBookings((prev) => ({
      ...prev,
      [date]: (prev[date] ?? []).map((b) => (b.id === updated.id ? updated : b)),
    }));
    setEditTarget(null);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;
    const { booking, date } = deleteTarget;
    setMockBookings((prev) => ({
      ...prev,
      [date]: (prev[date] ?? []).filter((b) => b.id !== booking.id),
    }));
    setDeleteTarget(null);
  };

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
              onClick={() => navigateWeek(-7)}
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
              onClick={() => navigateWeek(7)}
              className="rounded-lg border border-neutral-300 bg-white p-2 text-neutral-600 hover:bg-neutral-50 transition-colors duration-150"
              aria-label="Próxima semana"
            >
              <ChevronRight className="size-4" />
            </button>
            {toISODate(weekStart) !== todayISO && (
              <button
                onClick={goToCurrentWeek}
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
                            "flex min-h-12 items-center rounded-lg border px-2 py-1 text-caption",
                            slot.status === "available" &&
                              "border-success-200 bg-success-50 text-success-700",
                            slot.status === "past" &&
                              "border-neutral-200 bg-neutral-100 text-neutral-400",
                            slot.status === "booked" &&
                              "border-danger-200 bg-danger-50 text-danger-700"
                          )}
                        >
                          {slot.status === "booked" && slot.booking && (
                            <>
                              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                                <span className="truncate font-medium">{slot.booking.name}</span>
                                <span className="truncate">{slot.booking.department}</span>
                              </span>
                              <span className="flex shrink-0 items-center gap-1">
                                <button
                                  onClick={() =>
                                    setEditTarget({ booking: slot.booking!, date })
                                  }
                                  className="rounded p-1 text-danger-700 hover:bg-danger-100 transition-colors duration-150"
                                  aria-label="Editar agendamento"
                                >
                                  <Pencil className="size-3.5" />
                                </button>
                                <button
                                  onClick={() =>
                                    setDeleteTarget({ booking: slot.booking!, date })
                                  }
                                  className="rounded p-1 text-danger-700 hover:bg-danger-100 transition-colors duration-150"
                                  aria-label="Excluir agendamento"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </span>
                            </>
                          )}
                          {slot.status !== "booked" && <span className="mx-auto">—</span>}
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

      {editTarget && (
        <EditModal
          booking={editTarget.booking}
          onSave={(updated) => handleEditSave(editTarget.date, updated)}
          onClose={() => setEditTarget(null)}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          booking={deleteTarget.booking}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
        />
      )}
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