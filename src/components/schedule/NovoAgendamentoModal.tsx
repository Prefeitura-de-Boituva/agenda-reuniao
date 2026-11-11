import { useState } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalContent,
  Input,
  Button,
} from "@/components/ui";
import { DEPARTAMENTOS, SALAS } from "@/lib/agendamentoOpcoes";
import { toISODate } from "@/lib/schedule";
import {
  getSlotError,
  isDataPassada,
  isDataValida,
  isPastToday,
  MSG_DATA_PASSADA,
} from "@/lib/validations";

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
    }) => Promise<boolean> | boolean;
  salaInicial?: string;
  dataInicial?: string;
  externalError?: string | null;
}

export function NovoAgendamentoModal({
  open,
  onClose,
  onConfirm,
  salaInicial,
  dataInicial,
  externalError,
}: NovoAgendamentoModalProps) {
  // `toISODate` usa os getters locais; `toISOString()` (UTC) fazia o `min`
  // apontar para o dia seguinte entre 21h e 24h em fusos negativos como UTC-3.
  const today = toISODate(new Date());
  const [sala, setSala] = useState(salaInicial ?? SALAS[0]);
  const [data, setData] = useState(dataInicial ?? today);
  const [inicio, setInicio] = useState(SLOTS_INICIO[0]);
  const [fim, setFim] = useState(SLOTS_FIM[0]);
  const [nome, setNome] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = validar();
    if (msg) {
      setErro(msg);
      return;
    }
    setErro(null);
    setLoading(true);
    try {
      const result = await onConfirm({ sala, data, inicio, fim, nome, departamento });
      if (result) {
        onClose();
      }
    } catch {
      // error is handled by parent via externalError
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
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
                {SLOTS_INICIO.map((t) => (
                  <option key={t} value={t}>
                    {t}
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
                {SLOTS_FIM.filter((t) => t > inicio).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

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
            <Button type="submit" disabled={loading}>
              {loading ? "Carregando…" : "Confirmar"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}