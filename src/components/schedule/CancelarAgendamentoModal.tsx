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
import { useState } from "react";
import type { Booking } from "@/types/schedule";

/**
 * Modal de cancelamento que pede confirmação do departamento antes de efetivar o cancelamento.
 *
 * Props:
 * - booking: reserva a ser cancelada (contém nome, department, data, horário, etc.)
 * - onConfirm: callback que recebe `booking.id` e `booking.date`. Deve ser usado para remover a reserva
 *   (ex.: a mesma função `onDeleteBooking` já existente).
 * - onClose: fechar o modal sem ação.
 */
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
    // sucesso – executa o callback de remoção
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
              label="Informe o departamento para confirmar o cancelamento"
              value={departamentoInput}
              onChange={(e) => {
                setDepartamentoInput(e.target.value);
                if (error) setError(null);
              }}
              error={error ?? undefined}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={onClose}>
              Voltar
            </Button>
            <Button variant="danger" onClick={handleConfirm}>
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
