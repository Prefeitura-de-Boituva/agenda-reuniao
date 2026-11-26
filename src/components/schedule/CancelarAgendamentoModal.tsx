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
  const [credencial, setCredencial] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const roomName = ROOMS.find((r) => r.id === booking.roomId)?.name ?? booking.roomId;

  useEffect(() => {
    if (booking) {
      inputRef.current?.focus();
    }
  }, [booking]);

  const handleConfirm = async () => {
    const valor = credencial.trim();
    if (!valor) {
      setError("Senha é obrigatória");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      // A credencial é conferida no servidor (DELETE /api/agendamentos/[id]):
      // senha nas reservas novas, departamento naquelas que ficaram sem hash.
      // Os erros 400/403/404 são exibidos aqui.
      await cancelarAgendamento(booking.id, { senha: valor, departamento: valor });
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
            <Input
              ref={inputRef}
              label="Informe a senha para confirmar o cancelamento"
              value={credencial}
              onChange={(e) => {
                setCredencial(e.target.value);
                if (error) setError(null);
              }}
              helperText="Reservas antigas, criadas antes da senha, cancelam informando o departamento."
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