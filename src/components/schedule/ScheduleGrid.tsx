"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Pencil, Trash2 } from "lucide-react";
import type { Booking, Room, RoomSchedule, TimeSlot } from "@/types/schedule";
import {
  buildRoomSchedule,
  generateTimeSlots,
  formatDateShort,
  getWeekDates,
  parseDate,
  toISODate,
  SLOT_MINUTES,
} from "@/lib/schedule";
import { ROOMS } from "@/lib/mock-data";
import { NovoAgendamentoModal } from "./NovoAgendamentoModal";
import { CancelarAgendamentoModal } from "./CancelarAgendamentoModal";
import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Toast } from "@/components/ui";
import { getSlotError, isSlotValido } from "@/lib/validations";
import { cn } from "@/lib/utils";

function computeEndTime(startTime: string, durationBlocks: number): string {
  const slots = generateTimeSlots();
  const index = slots.findIndex((s) => s.startTime === startTime);
  if (index !== -1 && index + durationBlocks <= slots.length) {
    return slots[index + durationBlocks - 1].endTime;
  }
  const [hour, minute] = startTime.split(":").map(Number);
  const totalMinutes = hour * 60 + minute + durationBlocks * SLOT_MINUTES - 1;
  const endHour = Math.floor(totalMinutes / 60);
  const endMinute = totalMinutes % 60;
  return `${String(endHour).padStart(2, "0")}:${String(endMinute).padStart(2, "0")}`;
}

const SELECT_CLASSES =
  "flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-body text-neutral-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-100 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:outline-none";

interface BookingFormModalProps {
  mode: "create" | "edit";
  room: Room;
  date: string;
  initialStartTime?: string;
  booking?: Booking;
  existingBookings: Booking[];
  onSave: (booking: Booking) => void;
  onClose: () => void;
}

function BookingFormModal({
  mode,
  room,
  date,
  initialStartTime,
  booking,
  existingBookings,
  onSave,
  onClose,
}: BookingFormModalProps) {
  const slots = generateTimeSlots();
  const [name, setName] = useState(booking?.name ?? "");
  const [department, setDepartment] = useState(booking?.department ?? "");
  const [startTime, setStartTime] = useState(
    booking?.startTime ?? initialStartTime ?? slots[0].startTime
  );

  const [initialBlocks] = useState(() => {
    if (!booking) return 1;
    const [startHour, startMinute] = booking.startTime.split(":").map(Number);
    const [endHour, endMinute] = booking.endTime.split(":").map(Number);
    const startTotal = startHour * 60 + startMinute;
    const endTotal = endHour * 60 + endMinute + 1;
    return Math.round((endTotal - startTotal) / SLOT_MINUTES);
  });
  const [durationBlocks, setDurationBlocks] = useState(initialBlocks);

  const startIndex = slots.findIndex((s) => s.startTime === startTime);
  const maxBlocks = slots.length - startIndex;

  const findConflict = (candidateStart: string, blocks: number): Booking | undefined =>
    existingBookings.find((b) => {
      if (mode === "edit" && b.id === booking?.id) return false;
      const candidateEnd = computeEndTime(candidateStart, blocks);
      return b.startTime < candidateEnd && candidateStart < b.endTime;
    });

  const durationOptions = Array.from({ length: maxBlocks }, (_, index) => index + 1).filter(
    (blocks) => !findConflict(startTime, blocks)
  );

  const availableStarts = slots.filter(
    (_, index) =>
      index + durationBlocks <= slots.length && !findConflict(slots[index].startTime, durationBlocks)
  );
  const endTime = computeEndTime(startTime, durationBlocks);
  const conflict = findConflict(startTime, durationBlocks);
  const slotError = isSlotValido(startTime, endTime) ? null : getSlotError(startTime, endTime);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (conflict || slotError) return;
    const base =
      booking ??
      ({
        id: crypto.randomUUID(),
        roomId: room.id,
        date,
      } as Booking);
    onSave({ ...base, name, department, startTime, endTime });
  };

  return (
    <Modal open onClose={onClose}>
      <ModalContent>
        <ModalHeader>
          {mode === "create" ? `Novo Agendamento — ${room.name}` : "Editar Agendamento"}
        </ModalHeader>
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
              <label htmlFor="horario-inicio" className="text-caption font-medium text-neutral-700">
                Horário de início
              </label>
              <select
                id="horario-inicio"
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
              <label htmlFor="duracao" className="text-caption font-medium text-neutral-700">
                Duração
              </label>
              <select
                id="duracao"
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
            {conflict && (
              <p className="text-tiny font-medium text-danger-700">
                Conflito de horário com o agendamento de {conflict.name} das {conflict.startTime} às{" "}
                {conflict.endTime}.
              </p>
            )}
            {!conflict && slotError && (
              <p className="text-tiny font-medium text-danger-700" role="alert">
                {slotError}
              </p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!!conflict || slotError !== null}>
              {mode === "create" ? "Agendar" : "Salvar"}
            </Button>
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
        <ModalHeader>Cancelar Agendamento</ModalHeader>
        <ModalBody>
          Tem certeza que deseja cancelar o agendamento de{' '}
          <strong>{booking.name}</strong> ({booking.department}) das {booking.startTime} às{' '}
          {booking.endTime}?
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={onClose}>
            Não
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Cancelar agendamento
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}


export interface ScheduleGridProps {
  bookings: Record<string, Booking[]>;
  isLoading?: boolean;
  selectedRoomId: string;
  onSelectRoom: (roomId: string) => void;
  weekStart: Date;
  onNavigateWeek: (days: number) => void;
  onGoToCurrentWeek: () => void;
  onCreateBooking: (booking: Booking) => void;
  onUpdateBooking: (booking: Booking) => void;
  onDeleteBooking: (bookingId: string, date: string) => void;
  highlightedDate?: string;
}


export function ScheduleGrid({
  bookings,
  isLoading = false,
  selectedRoomId,
  onSelectRoom,
  weekStart,
  onNavigateWeek,
  onGoToCurrentWeek,
  onCreateBooking,
  onUpdateBooking,
  onDeleteBooking,
  highlightedDate,
}: ScheduleGridProps) {
  const [createTarget, setCreateTarget] = useState<{ date: string; startTime: string } | null>(null);
  const [editTarget, setEditTarget] = useState<Booking | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(id);
  }, [notice]);

  const selectedRoom = ROOMS.find((room) => room.id === selectedRoomId) ?? ROOMS[0];

  const schedule: RoomSchedule = useMemo(
    () =>
      buildRoomSchedule(selectedRoom, weekStart, (date) => bookings[date] ?? []),
    [selectedRoom, weekStart, bookings]
  );

  const weekDates = getWeekDates(weekStart);
  const todayISO = toISODate(new Date());

  const openCreateModal = (slot: TimeSlot, date: string) => {
    if (slot.status !== "available") return;
    setCreateTarget({ date, startTime: slot.startTime });
  };

  const openCancelModal = (booking: Booking) => {
    setDeleteTarget(booking);
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
              onClick={() => onNavigateWeek(-7)}
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
              onClick={() => onNavigateWeek(7)}
              className="rounded-lg border border-neutral-300 bg-white p-2 text-neutral-600 hover:bg-neutral-50 transition-colors duration-150"
              aria-label="Próxima semana"
            >
              <ChevronRight className="size-4" />
            </button>
            {toISODate(weekStart) !== todayISO && (
              <button
                onClick={onGoToCurrentWeek}
                className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-caption font-medium text-primary-700 hover:bg-primary-100 transition-colors duration-150"
              >
                Hoje
                    </button>
                )}
                <button
                  onClick={() => setCreateTarget({ date: todayISO, startTime: "08:00" })}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-caption font-medium text-neutral-600 hover:bg-neutral-50 transition-colors duration-150"
                >
                  Novo agendamento
                </button>
              </div>
            </div>

        <div className="flex flex-wrap items-center gap-2">
          {ROOMS.map((room) => (
            <button
              key={room.id}
              onClick={() => onSelectRoom(room.id)}
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

      <div
        className={cn(
          "relative overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-card",
          "sm:overflow-visible",
          isLoading && "pointer-events-none"
        )}
        role="grid"
        aria-label="Grade de horários da semana"
      >
        {isLoading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white/70">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span className="text-caption font-medium text-neutral-500">
              Carregando agendamentos...
            </span>
          </div>
        )}
        <table
          className={cn(
            "w-full min-w-max border-collapse text-sm",
            "sm:min-w-0",
            isLoading && "pointer-events-none"
          )}
        >
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="sticky left-0 bg-white px-4 py-3 text-left text-caption font-semibold text-neutral-500">
                Horário
              </th>
              {schedule.dates.map((date) => {
                const dayStart = parseDate(date);
                const isToday = date === todayISO;
                const isHighlighted = date === highlightedDate;
                return (
                  <th
                    key={date}
                    className={cn(
                      "px-4 py-3 text-left text-caption font-semibold",
                      isHighlighted ? "bg-primary-100 text-primary-900 border-b-2 border-primary" : isToday ? "text-primary" : "text-neutral-700"
                    )}
                    scope="col"
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
                          role="button"
                          tabIndex={0}
                          onClick={() =>
                            slot.status === "booked"
                              ? slot.booking && openCancelModal(slot.booking)
                              : openCreateModal(slot, date)
                          }
                          onKeyDown={(e) => {
                            if (e.key !== "Enter" && e.key !== " ") return;
                            e.preventDefault();
                            slot.status === "booked"
                              ? slot.booking && openCancelModal(slot.booking)
                              : openCreateModal(slot, date);
                          }}
                          aria-label={
                            slot.status === "booked" && slot.booking
                              ? `Cancelar agendamento de ${slot.booking.name} das ${slot.startTime} às ${slot.endTime}`
                              : `Agendar ${date} das ${slot.startTime} às ${slot.endTime}`
                          }
                          className={cn(
                            "flex h-12 w-full items-center overflow-hidden rounded-lg border px-2 py-1 text-caption",
                            "focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:outline-none",
                            slot.status === "available" &&
                              "cursor-pointer border-success-200 bg-success-50 text-success-700 hover:border-success-300 hover:bg-success-100",
                            slot.status === "booked" &&
                              "cursor-pointer border-danger-200 bg-danger-50 text-danger-700 hover:border-danger-300 hover:bg-danger-100"
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
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditTarget(slot.booking!);
                                  }}
                                  className="rounded p-1 text-danger-700 hover:bg-danger-100 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-danger-400 focus-visible:outline-none"
                                  aria-label="Editar agendamento"
                                  type="button"
                                >
                                  <Pencil className="size-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openCancelModal(slot.booking!);
                                  }}
                                  className="rounded p-1 text-danger-700 hover:bg-danger-100 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-danger-400 focus-visible:outline-none"
                                  aria-label="Cancelar agendamento"
                                  type="button"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </span>
                            </>
                          )}
                          {slot.status === "available" && <span className="mx-auto">LIVRE</span>}
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
      </div>

      {createTarget && (
        <NovoAgendamentoModal
          open={true}
          onClose={() => {
          setCreateTarget(null);
          // clear any previous error when modal closes
          setCreateError(null);
        }}
          onConfirm={(data) => {
            // Verify slot availability before confirming
            const existing = bookings[data.data] ?? [];
            const conflict = existing.some(
              (b) =>
                b.startTime < data.fim && data.inicio < b.endTime && b.roomId === selectedRoom.id
            );
            if (conflict) {
              setCreateError('Conflito de horário: já existe agendamento neste intervalo.');
              return;
            }
            const newBooking = {
              id: crypto.randomUUID(),
              roomId: selectedRoom.id,
              date: data.data,
              startTime: data.inicio,
              endTime: data.fim,
              name: data.nome,
              department: data.departamento,
            };
            onCreateBooking(newBooking);
            setCreateTarget(null);
            setCreateError(null);
            setNotice('Sua reunião foi agendada!');
          }}
          salaInicial={selectedRoom.name}
          dataInicial={createTarget.date}
          externalError={createError}
        />
      )}
      {editTarget && (
        <BookingFormModal
          mode="edit"
          room={selectedRoom}
          date={editTarget.date}
          booking={editTarget}
          existingBookings={bookings[editTarget.date] ?? []}
          onSave={(booking) => {
            onUpdateBooking(booking);
            setEditTarget(null);
            setNotice("Editado com sucesso!");
          }}
          onClose={() => setEditTarget(null)}
        />
      )}
      {deleteTarget && (
        <CancelarAgendamentoModal
          booking={deleteTarget}
          onConfirm={(id, date) => {
            onDeleteBooking(id, date);
            setDeleteTarget(null);
          }}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      <Toast show={notice !== null} onClose={() => setNotice(null)}>
        {notice}
      </Toast>
    </div>
  );
}

export default ScheduleGrid;