"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Toast,
} from "@/components/ui";
import { useState, useEffect, useRef } from "react";
import type { Booking } from "@/types/schedule";

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
  const [showToast, setShowToast] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (booking) {
      inputRef.current?.focus();
    }
  }, [booking]);

  const handleConfirm = () => {
    const trimmed = departamentoInput.trim();
    if (!trimmed) {
      setError("Departamento é obrigatório");
      return;
    }
    if (trimmed !== booking.department) {
      setError("Departamento incorreto");
      return;
    }
    onConfirm(booking.id, booking.date);
    setShowToast(true);
    onClose();
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
            >
              Voltar
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleConfirm}
            >
              Confirmar cancelamento
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Toast show={showToast} onClose={() => setShowToast(false)}>
        Cancelamento realizado com sucesso!
      </Toast>
    </>
  );
}