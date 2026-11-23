import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalContent,
  Input,
  Button,
} from "@/components/ui";
import type { Papel } from "@/lib/acesso";
import {
  DEPARTAMENTOS,
  SALAS,
  salaPermitePrioridadeZero,
} from "@/lib/agendamentoOpcoes";
import { fetchBookings } from "@/lib/bookings";
import { ROOMS } from "@/lib/rooms";
import { findBookingConflict, listBookingConflicts, toISODate } from "@/lib/schedule";
import {
  getSlotError,
  isDataPassada,
  isDataValida,
  isPastToday,
  MSG_DATA_PASSADA,
} from "@/lib/validations";
import type { Booking, Prioridade } from "@/types/schedule";

const gerarSlotsInicio = () => {
  const slots: string[] = [];
  for (let h = 8; h <= 16; h++) {
    for (const m of [0, 30]) {
      const hour = String(h).padStart(2, "0");
      const minute = String(m).padStart(2, "0");
      slots.push(`${hour}:${minute}`);
    }
  }
  return slots;
};

const SLOTS_INICIO = gerarSlotsInicio();
const SLOTS_FIM = SLOTS_INICIO.map((_, i) => {
  const [h, m] = SLOTS_INICIO[i].split(":").map(Number);
  const total = h * 60 + m + 30;
  const hour = String(Math.floor(total / 60)).padStart(2, "0");
  const minute = String(total % 60).padStart(2, "0");
  return `${hour}:${minute}`;
});

export interface NovoAgendamentoModalProps {
  open: boolean;
  onClose: () => void;
onConfirm: (data: {
      sala: string;
      data: string;
      inicio: string;
      fim: string;
      nome: string;
      departamento: string;
      prioridade: Prioridade;
    }) => Promise<boolean> | boolean;
  salaInicial?: string;
  dataInicial?: string;
  horarioInicial?: string;
  /** Agendamentos da sala/data iniciais, já carregados pela grade. */
  existingBookings?: Booking[];
  externalError?: string | null;
  /** Papel de quem agenda; só `PREFEITO` vê o controle de Prioridade 0. */
  papel?: Papel;
}

export function NovoAgendamentoModal({
  open,
  onClose,
  onConfirm,
  salaInicial,
  dataInicial,
  horarioInicial,
  existingBookings,
  externalError,
  papel = "NORMAL",
}: NovoAgendamentoModalProps) {
  // `toISODate` usa os getters locais; `toISOString()` (UTC) fazia o `min`
  // apontar para o dia seguinte entre 21h e 24h em fusos negativos como UTC-3.
  const today = toISODate(new Date());
  const [sala, setSala] = useState(salaInicial ?? SALAS[0]);
  const [data, setData] = useState(dataInicial ?? today);
  // Vindo de um slot livre da grade, o início precisa ser o horário clicado;
  // sem isso o usuário era obrigado a escolher o horário de novo.
  const inicioInicial =
    horarioInicial && SLOTS_INICIO.includes(horarioInicial)
      ? horarioInicial
      : SLOTS_INICIO[0];
  const [inicio, setInicio] = useState(inicioInicial);
  const [fim, setFim] = useState(SLOTS_FIM[SLOTS_INICIO.indexOf(inicioInicial)]);
  const [nome, setNome] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Seed instantâneo com o que a grade já buscou; o effect abaixo revalida
  // contra o servidor sempre que sala ou data mudam.
  const [bookingsConflito, setBookingsConflito] = useState<Booking[]>(
    () => existingBookings ?? []
  );
  const [carregandoBookings, setCarregandoBookings] = useState(false);
  // Issue #66: a Prioridade 0 só existe para o papel PREFEITO e em sala que a
  // permite; `salaPermitePrioridadeZero` entra no efeito abaixo porque trocar de
  // sala precisa desligar o controle e descartar a confirmação já dada.
  const [prioridadeZero, setPrioridadeZero] = useState(false);
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);

  useEffect(() => {
    if (!open) return;
    const roomId = ROOMS.find((r) => r.name === sala)?.id;
    if (!roomId) return;
    let cancelado = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- ativa o loading antes do fetch; mesmo padrão de grade/page.tsx.
    setCarregandoBookings(true);
    fetchBookings(roomId, [data]).then((resultado) => {
      if (cancelado) return;
      setBookingsConflito(resultado[data] ?? []);
      setCarregandoBookings(false);
    });
    return () => {
      cancelado = true;
    };
  }, [open, sala, data]);

  const slotsInicio = useMemo(
    () =>
      SLOTS_INICIO.map((value, i) => ({
        value,
        conflito: findBookingConflict(value, SLOTS_FIM[i], bookingsConflito),
      })),
    [bookingsConflito]
  );

  const slotsFim = useMemo(
    () =>
      SLOTS_FIM.map((value) => ({
        value,
        conflito: findBookingConflict(inicio, value, bookingsConflito),
      })),
    [inicio, bookingsConflito]
  );

  const conflitosAtuais = listBookingConflicts(inicio, fim, bookingsConflito);
  const conflitoAtual = conflitosAtuais[0];

  const podePrioridadeZero = papel === "PREFEITO" && salaPermitePrioridadeZero(sala);
  const prioridade: Prioridade =
    podePrioridadeZero && prioridadeZero ? "PREFEITO" : "NORMAL";
  // A Prioridade 0 autoriza a sobreposição, então o conflito deixa de bloquear e
  // passa a exigir a segunda confirmação (a primeira é ligar o próprio controle).
  const sobreposicao = prioridade === "PREFEITO" ? conflitosAtuais : [];

  const validar = () => {
    if (isDataPassada(data)) return MSG_DATA_PASSADA;
    if (isPastToday(data, inicio)) return "Horário já passou no dia atual.";
    if (!nome.trim()) return "Nome é obrigatório";
    if (!departamento) return "Departamento é obrigatório";
    if (fim <= inicio) return "Horário de fim deve ser posterior ao início";
    // Complemento das verificações acima: reaproveita as mesmas funções usadas
    // no endpoint (janela 08:00–17:00, duração mínima e fim > início) para que
    // o formulário e a API falhem com as mesmas mensagens.
    if (!isDataValida(data)) return "Data inválida. Use o formato YYYY-MM-DD.";
    const erroSlot = getSlotError(inicio, fim);
    if (erroSlot) return erroSlot;
    // Guarda extra: o botão já fica desabilitado em conflito, mas o submit
    // implícito (Enter num campo) não deve passar. Mesma mensagem do 409 da API.
    // Com Prioridade 0 ligada o conflito é permitido — mas só após a confirmação.
    if (conflitoAtual && prioridade === "NORMAL") {
      return "Horário conflita com agendamento existente";
    }
  };

  const criarAgendamento = async () => {
    setErro(null);
    setLoading(true);
    try {
      const result = await onConfirm({ sala, data, inicio, fim, nome, departamento, prioridade });
      setConfirmacaoAberta(false);
      if (result) onClose();
    } catch {
      // error is handled by parent via externalError
      setConfirmacaoAberta(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = validar();
    if (msg) {
      setErro(msg);
      return;
    }
    if (sobreposicao.length > 0) {
      setConfirmacaoAberta(true);
      return;
    }
    void criarAgendamento();
  };

  return (
    <>
    <Modal open={open && !confirmacaoAberta} onClose={onClose}>
      <ModalContent>
        <ModalHeader>Novo Agendamento</ModalHeader>
        <form onSubmit={handleSubmit} noValidate>
          <ModalBody className="flex flex-col gap-4">
            <div>
              <label htmlFor="sala-select" className="text-caption font-medium text-neutral-700">
                Sala
              </label>
              <select
                id="sala-select"
                className="flex h-10 w-full rounded-lg border bg-white px-3 text-body text-neutral-900 focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary-100"
                value={sala}
                onChange={(e) => setSala(e.target.value)}
              >
                {SALAS.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>

            {salaPermitePrioridadeZero(sala) && (
              <div
                role="status"
                className="rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-tiny text-warning-700"
              >
                <span className="font-medium">Aviso de Prioridade:</span> Esta sala destina-se ao
                atendimento de reuniões do Gabinete do Prefeito, as quais possuem prioridade sobre os
                demais agendamentos. Dessa forma, as reuniões em andamento poderão ser interrompidas e
                encerradas a qualquer momento, conforme a necessidade do Gabinete.
              </div>
            )}

            {podePrioridadeZero && (
              <div className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2">
                <label
                  htmlFor="prioridade-zero-toggle"
                  className="flex cursor-pointer items-start gap-2 text-tiny text-primary-900"
                >
                  <input
                    id="prioridade-zero-toggle"
                    type="checkbox"
                    className="mt-0.5 size-4 shrink-0 cursor-pointer"
                    checked={prioridadeZero}
                    onChange={(e) => setPrioridadeZero(e.target.checked)}
                  />
                  <span>
                    <span className="font-medium">Prioridade 0 (Prefeito).</span> Permite agendar
                    num horário já ocupado desta sala. A reserva existente é mantida e o
                    departamento responsável será avisado para combinar nova data.
                  </span>
                </label>
              </div>
            )}

            <Input
              label="Data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              min={today}
              required
            />

            <div>
              <label htmlFor="inicio-select" className="text-caption font-medium text-neutral-700">
                Horário início
              </label>
              <select
                id="inicio-select"
                className="flex h-10 w-full rounded-lg border bg-white px-3 text-body text-neutral-900 focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary-100"
                value={inicio}
                onChange={(e) => {
                  const novoInicio = e.target.value;
                  setInicio(novoInicio);
                  // Mantém o fim sempre posterior ao início; se o início passou
                  // do fim atual, alinha o fim ao próximo bloco de 30 min.
                  const index = SLOTS_INICIO.indexOf(novoInicio);
                  const novoFim = SLOTS_FIM[index] ?? SLOTS_FIM[SLOTS_FIM.length - 1];
                  if (fim <= novoInicio) setFim(novoFim);
                }}
              >
                {slotsInicio.map((slot) => (
                  <option
                    key={slot.value}
                    value={slot.value}
                    // Com Prioridade 0 o horário ocupado volta a ser selecionável;
                    // sem ela continua o bloqueio da issue #62.
                    disabled={prioridade === "NORMAL" && !!slot.conflito}
                    className={slot.conflito ? "opacity-50 cursor-not-allowed" : undefined}
                    title={
                      slot.conflito
                        ? `Horário já agendado por ${slot.conflito.name} — ${slot.conflito.department}`
                        : undefined
                    }
                  >
                    {slot.conflito ? `${slot.value} (Ocupado)` : slot.value}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="fim-select" className="text-caption font-medium text-neutral-700">
                Horário fim
              </label>
              <select
                id="fim-select"
                className="flex h-10 w-full rounded-lg border bg-white px-3 text-body text-neutral-900 focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary-100"
                value={fim}
                onChange={(e) => setFim(e.target.value)}
              >
                {slotsFim
                  .filter((slot) => slot.value > inicio)
                  .map((slot) => (
                    <option
                      key={slot.value}
                      value={slot.value}
                      disabled={prioridade === "NORMAL" && !!slot.conflito}
                      className={slot.conflito ? "opacity-50 cursor-not-allowed" : undefined}
                      title={
                        slot.conflito
                          ? `Horário já agendado por ${slot.conflito.name} — ${slot.conflito.department}`
                          : undefined
                      }
                    >
                      {slot.conflito ? `${slot.value} (Ocupado)` : slot.value}
                    </option>
                  ))}
              </select>
            </div>

            {carregandoBookings && (
              <p className="text-tiny text-neutral-500">Verificando disponibilidade…</p>
            )}
            {conflitoAtual && prioridade === "NORMAL" && (
              <p className="text-tiny font-medium text-danger-700" role="alert">
                Conflito de horário com o agendamento de {conflitoAtual.name} (
                {conflitoAtual.department}) das {conflitoAtual.startTime} às{" "}
                {conflitoAtual.endTime}.
              </p>
            )}
            <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />

            <div>
              <label htmlFor="departamento-select" className="text-caption font-medium text-neutral-700">
                Departamento
              </label>
              <select
                id="departamento-select"
                className="flex h-10 w-full rounded-lg border bg-white px-3 text-body text-neutral-900 focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary-100"
                value={departamento}
                onChange={(e) => setDepartamento(e.target.value)}
              >
                <option value="" disabled hidden>Selecione o departamento</option>
                {DEPARTAMENTOS.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            </div>

{erro && (
          <p id="error-message" className="text-tiny text-danger-700" role="alert">
            {erro}
          </p>
        )}
        {externalError && (
          <p id="external-error-message" className="text-tiny text-danger-700" role="alert">
            {externalError}
          </p>
        )}
          </ModalBody>
          <ModalFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                carregandoBookings ||
                (prioridade === "NORMAL" && !!conflitoAtual)
              }
            >
              {loading ? "Carregando…" : "Confirmar"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>

    <Modal open={confirmacaoAberta} onClose={() => setConfirmacaoAberta(false)}>
      <ModalContent>
        <ModalHeader>Confirmar Prioridade 0</ModalHeader>
        <ModalBody className="flex flex-col gap-3">
          <p className="m-0 font-medium text-neutral-900">
            Este horário já está reservado por{" "}
            {sobreposicao.map((reserva) => `${reserva.name} (${reserva.department})`).join("; ")}.
            Confirma agendamento com Prioridade 0?
          </p>
          <p className="m-0 text-tiny text-neutral-600">
            {data}, das {inicio} às {fim}, na {sala}. As reservas existentes serão mantidas
            e os departamentos responsáveis serão avisados para combinar nova data.
          </p>
          <ul className="m-0 list-disc pl-4 text-tiny text-neutral-700">
            {sobreposicao.map((reserva) => (
              <li key={reserva.id}>
                {reserva.name} ({reserva.department}) das {reserva.startTime} às {reserva.endTime}
              </li>
            ))}
          </ul>
        </ModalBody>
        <ModalFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmacaoAberta(false)}
            disabled={loading}
          >
            Voltar
          </Button>
          <Button type="button" onClick={() => void criarAgendamento()} disabled={loading}>
            {loading ? "Carregando…" : "Confirmar Prioridade 0"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
    </>
  );
}