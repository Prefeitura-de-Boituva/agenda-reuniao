"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
} from "@/components/ui";
import { useState, useEffect, useRef } from "react";
import type { Booking } from "@/types/schedule";
import { cancelarAgendamento, ApiError } from "@/lib/apiClient";

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
  const [departamentoInput, setDepartamentoInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (booking) {
      inputRef.current?.focus();
    }
  }, [booking]);

  const handleConfirm = async () => {
    const trimmed = departamentoInput.trim();
    if (!trimmed) {
      setError("Departamento é obrigatório");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      // A validação do departamento (case-insensitive) é feita no servidor
      // (DELETE /api/agendamentos/[id]) e os erros 400/403/404 são exibidos aqui.
      await cancelarAgendamento(booking.id, trimmed);
      onConfirm(booking.id, booking.date);
      onClose();
    } catch (err) {
      // 404 = o agendamento não existe (ou nunca existiu) no servidor — ex.:
      // os bookings de demonstração da grade. Mantém o comportamento original:
      // remove o agendamento da grade localmente, sem exibir erro.
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
              <strong>Sala:</strong> {booking.roomId}
            </p>
            <p>
              <strong>Data:</strong> {booking.date}
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
            <Input
              ref={inputRef}
              label="Informe o departamento para confirmar o cancelamento"
              value={departamentoInput}
              onChange={(e) => {
                setDepartamentoInput(e.target.value);
                if (error) setError(null);
              }}
              error={error ?? undefined}
              autoComplete="off"
              aria-describedby={error ? "cancel-error-message" : undefined}
              disabled={loading}
            />
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