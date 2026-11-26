"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Loader2, Pencil, Trash2 } from "lucide-react";
import type { Booking, Room, RoomSchedule, TimeSlot } from "@/types/schedule";
import {
  buildRoomSchedule,
  findBookingConflict,
  generateTimeSlots,
  formatDateShort,
  getWeekDates,
  parseDate,
  toISODate,
  SLOT_MINUTES,
} from "@/lib/schedule";
import { ROOMS } from "@/lib/rooms";
import { ROOM_COLORS } from "@/lib/room-colors";
import { NovoAgendamentoModal } from "./NovoAgendamentoModal";
import { CancelarAgendamentoModal } from "./CancelarAgendamentoModal";
import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Toast } from "@/components/ui";
import { getSlotError, isPastToday, isSlotValido } from "@/lib/validations";
import { ApiError, editarAgendamento } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

function computeEndTime(startTime: string, durationBlocks: number): string {
  const slots = generateTimeSlots();
  const index = slots.findIndex((s) => s.startTime === startTime);
  if (index !== -1 && index + durationBlocks <= slots.length) {
    return slots[index + durationBlocks - 1].endTime;
  }
  const [hour, minute] = startTime.split(":").map(Number);
  const totalMinutes = hour * 60 + minute + durationBlocks * SLOT_MINUTES;
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
  onSave: (booking: Booking) => void | Promise<void>;
  onClose: () => void;
  externalError?: string | null;
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
  externalError,
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
    const endTotal = endHour * 60 + endMinute;
    return Math.round((endTotal - startTotal) / SLOT_MINUTES);
  });
  const [durationBlocks, setDurationBlocks] = useState(initialBlocks);
  const [saving, setSaving] = useState(false);

  const startIndex = slots.findIndex((s) => s.startTime === startTime);
  const maxBlocks = slots.length - startIndex;

  // Em edições o próprio agendamento é ignorado (`booking?.id`); em criações
  // `booking` é undefined e nenhum id é excluído.
  const findConflict = (candidateStart: string, blocks: number): Booking | undefined =>
    findBookingConflict(
      candidateStart,
      computeEndTime(candidateStart, blocks),
      existingBookings,
      booking?.id
    );

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

  const pastError = isPastToday(date, startTime) ? "Horário já passou no dia atual." : null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (conflict || slotError || pastError || saving) return;
    const base =
      booking ??
      ({
        id: crypto.randomUUID(),
        roomId: room.id,
        date,
      } as Booking);
    setSaving(true);
    try {
      // `onSave` grava no servidor antes de atualizar a grade; se falhar, o
      // modal continua aberto com o erro em `externalError`.
      await onSave({ ...base, name, department, startTime, endTime });
    } finally {
      setSaving(false);
    }
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
                Conflito de horário com o agendamento de {conflict.name} das {conflict.startTime} às{' '}
                {conflict.endTime}.
              </p>
            )}
            {pastError && (
              <p className="text-tiny font-medium text-danger-700" role="alert">
                {pastError}
              </p>
            )}
            {!conflict && slotError && (
              <p className="text-tiny font-medium text-danger-700" role="alert">
                {slotError}
              </p>
            )}
            {externalError && (
              <p className="text-tiny font-medium text-danger-700" role="alert">
                {externalError}
              </p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving || !!conflict || slotError !== null || pastError !== null}
            >
              {saving ? "Salvando…" : mode === "create" ? "Agendar" : "Salvar"}
            </Button>
          </ModalFooter>
        </form>
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
  const [expandedDays, setExpandedDays] = useState<Set<string>>(() => new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

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
  const isDayExpanded = (date: string) =>
    date === todayISO ? !expandedDays.has(date) : expandedDays.has(date);
  const toggleDay = (date: string) =>
    setExpandedDays((current) => {
      const next = new Set(current);
      const currentlyExpanded = date === todayISO ? !next.has(date) : next.has(date);
      if (currentlyExpanded) {
        if (date === todayISO) next.add(date);
        else next.delete(date);
      } else if (date === todayISO) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });

  const openCreateModal = (slot: TimeSlot, date: string) => {
    if (slot.status !== "available") return;
    // RN16: a grade continua navegável em semanas passadas para consulta, mas
    // não abre a criação em dias anteriores a hoje.
    if (date < todayISO) return;
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
          {ROOMS.map((room) => {
            const isSelected = room.id === selectedRoomId;
            const color = ROOM_COLORS[room.id] ?? ROOM_COLORS["sala-azul"];
            return (
              <button
                key={room.id}
                onClick={() => onSelectRoom(room.id)}
                className={cn(
                  "rounded-lg px-4 py-2 text-caption font-medium transition-colors duration-150",
                  isSelected
                    ? cn(color.bg, color.border, color.text, "shadow-card")
                    : "border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50"
                )}
              >
                {room.name}
              </button>
            );
          })}
        </div>
      </div>

      <section
        className={cn("flex w-full min-w-0 flex-col gap-4 md:hidden", isLoading && "pointer-events-none")}
        aria-label="Grade de horários por dia"
      >
        {schedule.dates.map((date) => {
          const dayStart = parseDate(date);
          const isToday = date === todayISO;
          const expanded = isDayExpanded(date);
          const availableCount = schedule.slotsByDate[date].filter((slot) => slot.status === "available").length;
          const slotsId = `mobile-slots-${date}`;
          return (
            <article
              key={date}
              className={cn(
                "w-full min-w-0 max-w-full overflow-hidden rounded-xl border bg-white shadow-card",
                isToday ? "border-2 border-primary bg-primary-50" : "border-neutral-200",
                date === highlightedDate && !isToday && "border-primary-300"
              )}
            >
              <h2 className="m-0">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={slotsId}
                  aria-label={`${expanded ? "Recolher" : "Expandir"} horários de ${formatDateShort(dayStart)}; ${availableCount} de ${schedule.slotsByDate[date].length} disponíveis`}
                  onClick={() => toggleDay(date)}
                  className="flex w-full min-w-0 items-center gap-3 px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-400"
                >
                  <ChevronDown
                    aria-hidden="true"
                    className={cn("size-5 shrink-0 text-neutral-500 transition-transform duration-200", !expanded && "-rotate-90")}
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={cn("truncate text-body font-semibold capitalize", isToday ? "text-primary-800" : "text-neutral-800")}>
                      {formatDateShort(dayStart)}
                    </span>
                    <span className="text-tiny text-neutral-600">{availableCount}/{schedule.slotsByDate[date].length} livres</span>
                  </span>
                  {isToday && <span className="shrink-0 rounded-full bg-primary-100 px-2.5 py-1 text-tiny font-semibold text-primary-800">Hoje</span>}
                </button>
              </h2>
              <div
                id={slotsId}
                aria-hidden={!expanded}
                inert={!expanded}
                className={cn("grid transition-[grid-template-rows] duration-200 motion-reduce:transition-none", expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
              >
                <ul className={cn("min-h-0 min-w-0 overflow-hidden divide-y divide-neutral-100", expanded && "border-t border-neutral-200")}>
                  {schedule.slotsByDate[date].map((slot) => {
                    const booking = slot.booking;
                    return (
                      <li key={slot.startTime} className="flex min-w-0 items-center gap-1 px-3 py-2">
                        <button
                          type="button"
                          onClick={() => booking ? openCancelModal(booking) : openCreateModal(slot, date)}
                          aria-label={booking ? `Ver agendamento de ${booking.name}, ${slot.startTime} às ${slot.endTime}` : `Agendar ${date} das ${slot.startTime} às ${slot.endTime}`}
                          className={cn(
                            "flex min-w-0 max-w-full flex-1 items-center gap-3 rounded-lg border p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400",
                            booking ? "border-danger-200 bg-danger-50 text-danger-800 hover:bg-danger-100" : "border-success-200 bg-success-50 text-success-700 hover:bg-success-100"
                          )}
                        >
                          <span className="flex shrink-0 flex-col text-caption font-semibold tabular-nums leading-tight">
                            <span>{slot.startTime}</span><span className="text-tiny font-normal">{slot.endTime}</span>
                          </span>
                          {booking ? (
                            <span className="flex min-w-0 flex-1 flex-col overflow-hidden leading-tight">
                              <span className="truncate text-caption font-medium" title={booking.name}>{booking.name}</span>
                              <span className="truncate text-tiny" title={booking.department}>{booking.department}</span>
                            </span>
                          ) : <span className="ml-auto shrink-0 text-caption font-semibold">LIVRE</span>}
                        </button>
                        {booking && (
                          // A grade mobile só abria o cancelamento: sem este
                          // atalho não havia como editar uma reserva no celular,
                          // já que o lápis existia apenas na grade desktop.
                          <button
                            type="button"
                            onClick={() => setEditTarget(booking)}
                            aria-label={`Editar agendamento de ${booking.name}, ${slot.startTime} às ${slot.endTime}`}
                            className="shrink-0 rounded-lg p-2.5 text-danger-700 hover:bg-danger-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-400"
                          >
                            <Pencil aria-hidden="true" className="size-4" />
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </article>
          );
        })}
      </section>

      <div
        className={cn(
          "relative hidden w-full min-w-0 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-card md:block",
          isLoading && "pointer-events-none"
        )}
        role="grid"
        aria-label="Grade de horários da semana"
        data-testid="desktop-table-container"
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
            "w-full min-w-[760px] border-collapse text-sm sm:min-w-0",
            isLoading && "pointer-events-none"
          )}
        >
          <thead>
            <tr className="border-b border-neutral-200">
              <th className="sticky left-0 z-10 w-28 min-w-28 bg-white px-2 py-3 text-left text-caption font-semibold text-neutral-500 sm:px-4">
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
                      "min-w-20 px-2 py-3 text-left text-caption font-semibold sm:px-4",
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
                  <td className="sticky left-0 z-[1] w-28 min-w-28 bg-white px-2 py-2 whitespace-nowrap text-body tabular-nums text-neutral-600 sm:px-4">
                    {startTime} – {endTime}
                  </td>
                  {schedule.dates.map((date) => {
                    const slot = schedule.slotsByDate[date][index];
                    return (
                      <td key={date} className="min-w-20 px-1 py-1.5 sm:px-2">
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
                            "flex h-12 w-full min-w-0 items-center gap-1 overflow-hidden rounded-lg border px-1 py-1 text-caption sm:gap-2 sm:px-2",
                            "focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:outline-none",
                            slot.status === "available" &&
                              "cursor-pointer border-success-200 bg-success-50 text-success-700 hover:border-success-300 hover:bg-success-100",
                            slot.status === "booked" &&
                              "cursor-pointer border-danger-200 bg-danger-50 text-danger-700 hover:border-danger-300 hover:bg-danger-100"
                          )}
                        >
                          {slot.status === "booked" && slot.booking && (
                            <>
                              <span className="flex min-w-0 flex-1 flex-col leading-tight" title={`${slot.booking.name} — ${slot.booking.department}`}>
                                <span className="truncate font-medium">{slot.booking.name}</span>
                                <span className="truncate">{slot.booking.department}</span>
                              </span>
                              <span className="flex shrink-0 items-center gap-0 sm:gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditTarget(slot.booking!);
                                  }}
                                  className="rounded p-0.5 text-danger-700 hover:bg-danger-100 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-danger-400 focus-visible:outline-none sm:p-1"
                                  aria-label="Editar agendamento"
                                  type="button"
                                >
                                  <Pencil className="size-3 sm:size-3.5" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openCancelModal(slot.booking!);
                                  }}
                                  className="rounded p-0.5 text-danger-700 hover:bg-danger-100 transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-danger-400 focus-visible:outline-none sm:p-1"
                                  aria-label="Cancelar agendamento"
                                  type="button"
                                >
                                  <Trash2 className="size-3 sm:size-3.5" />
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
          onConfirm={async (data) => {
            // Call backend to create booking and handle conflict
            try {
              const res = await fetch('/api/agendamentos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  nome: data.nome,
                  departamento: data.departamento,
                  senha: data.senha,
                  sala: data.sala,
                  data: data.data,
                  horaInicio: data.inicio,
                  horaFim: data.fim,
                }),
              });
              if (!res.ok) {
                const err = await res.json();
                if (err?.error) {
                  setCreateError(err.error);
                } else if (res.status === 409) {
                  setCreateError('Horário conflita com agendamento existente');
                } else {
                  setCreateError(err?.error ?? 'Erro ao criar agendamento.');
                }
                return false;
              }
              // Success: add booking locally, keeping the server‑generated id
              // so the cancellation (DELETE /api/agendamentos/[id]) finds it.
              const created = (await res.json()) as { id?: string };
              onCreateBooking({
                id: created.id ?? crypto.randomUUID(),
                roomId: selectedRoom.id,
                date: data.data,
                startTime: data.inicio,
                endTime: data.fim,
                name: data.nome,
                department: data.departamento,
              });
              setCreateTarget(null);
              setCreateError(null);
              setNotice('Sua reunião foi agendada!');
              return true;
                } catch (e) {
                  setCreateError('Erro ao criar agendamento.');
                  return false;
                }
          }}


          salaInicial={selectedRoom.name}
          dataInicial={createTarget.date}
          horarioInicial={createTarget.startTime}
          existingBookings={bookings[createTarget.date] ?? []}
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
          externalError={editError}
          onSave={async (booking) => {
            // A edição é gravada no banco antes de atualizar a grade: sem isso a
            // reserva editada só existia no navegador de quem editou e a tela
            // inicial continuava contando o horário antigo.
            try {
              await editarAgendamento(booking.id, {
                nome: booking.name,
                departamento: booking.department,
                horaInicio: booking.startTime,
                horaFim: booking.endTime,
              });
            } catch (err) {
              // 404 = a reserva não existe mais no servidor (cancelada em outra
              // aba/sessão desde que a grade foi carregada). Aplica a edição mesmo
              // assim, como o cancelamento já faz, em vez de bloquear o usuário.
              if (!(err instanceof ApiError && err.status === 404)) {
                setEditError(
                  err instanceof Error ? err.message : "Não foi possível salvar a edição."
                );
                return;
              }
            }
            setEditError(null);
            onUpdateBooking(booking);
            setEditTarget(null);
            setNotice("Editado com sucesso!");
          }}
          onClose={() => {
            setEditTarget(null);
            setEditError(null);
          }}
        />
      )}
      {deleteTarget && (
        <CancelarAgendamentoModal
          booking={deleteTarget}
          onConfirm={(id, date) => {
            onDeleteBooking(id, date);
            setNotice("Agendamento cancelado com sucesso!");
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
