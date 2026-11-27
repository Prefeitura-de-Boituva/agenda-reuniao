"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@/components/ui";
import { useState, useEffect, useRef } from "react";
import type { Booking } from "@/types/schedule";
import { cancelarAgendamento, ApiError } from "@/lib/apiClient";
import { DEPARTAMENTOS, type Departamento } from "@/lib/agendamentoOpcoes";
import { ROOMS } from "@/lib/rooms";
import { formatDate, parseDate } from "@/lib/schedule";

interface CancelarAgendamentoModalProps {
  booking: Booking;
  onConfirm: (bookingId: string, date: string) => void;
  onClose: () => void;
}

export function CancelarAgendamentoModal({
  booking,
  onConfirm,
  onClose,
}: CancelarAgendamentoModalProps) {
  const [departamento, setDepartamento] = useState<Departamento | "">("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);
  const roomName = ROOMS.find((r) => r.id === booking.roomId)?.name ?? booking.roomId;

  useEffect(() => {
    if (booking) {
      selectRef.current?.focus();
    }
  }, [booking]);

  const handleConfirm = async () => {
    if (!departamento) {
      setError("Departamento é obrigatório");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      // A validação final do departamento continua no servidor
      // (DELETE /api/agendamentos/[id]) e os erros 400/403/404 são exibidos aqui.
      await cancelarAgendamento(booking.id, departamento);
      onConfirm(booking.id, booking.date);
      onClose();
    } catch (err) {
      // 404 = o agendamento não existe mais no servidor (cancelado em outra
      // aba/sessão desde que a grade foi carregada). Mantém o comportamento
      // original: remove o agendamento da grade localmente, sem exibir erro.
      if (err instanceof ApiError && err.status === 404) {
        onConfirm(booking.id, booking.date);
        onClose();
        return;
      }
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível cancelar o agendamento. Tente novamente."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal open onClose={onClose}>
        <ModalContent>
          <ModalHeader>Cancelar Agendamento</ModalHeader>
          <ModalBody className="flex flex-col gap-4">
            <p>
              <strong>Sala:</strong> {roomName}
            </p>
            <p>
              <strong>Data:</strong> {formatDate(parseDate(booking.date))}
            </p>
            <p>
              <strong>Horário:</strong> {booking.startTime} – {booking.endTime}
            </p>
            <p>
              <strong>Nome:</strong> {booking.name}
            </p>
            <p>
              <strong>Departamento atual:</strong> {booking.department}
            </p>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="cancel-departamento-select"
                className="text-caption font-medium text-neutral-700"
              >
                Selecione o departamento para confirmar o cancelamento
              </label>
              <select
                ref={selectRef}
                id="cancel-departamento-select"
                className="flex h-10 w-full rounded-lg border border-neutral-300 bg-white px-3 text-body text-neutral-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-100 focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:outline-none"
                value={departamento}
                onChange={(e) => {
                  setDepartamento(e.target.value as Departamento | "");
                  if (error) setError(null);
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? "cancel-error-message" : undefined}
                disabled={loading}
                required
              >
                <option value="" disabled hidden>
                  Selecione o departamento
                </option>
                {DEPARTAMENTOS.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>
            {error && (
              <p id="cancel-error-message" className="text-tiny text-danger-700" role="alert">
                {error}
              </p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Voltar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirm}
              disabled={loading}
            >
              {loading ? "Cancelando…" : "Confirmar cancelamento"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}