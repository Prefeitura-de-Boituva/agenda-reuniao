import { useState, useEffect } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalContent,
  Input,
  Button,
} from "@/components/ui";

// Constants ---------------------------------------------------------------
const SALAS = ["Sala 1", "Sala 2", "Sala 3"]; // 3 opções
const DEPARTAMENTOS = [
  "Financeiro",
  "RH",
  "Marketing",
  "TI",
  "Operações",
  "Vendas",
  "Legal",
  "Administração",
];

// gera slots de início de 08:00 a 16:30 (intervalo 30min)
const gerarSlotsInicio = () => {
  const slots: string[] = [];
  for (let h = 8; h <= 16; h++) {
    for (const m of [0, 30]) {
      const hour = String(h).padStart(2, "0");
      const minute = String(m).padStart(2, "0");
      slots.push(`${hour}:${minute}`);
    }
  }
  // inclui 16:30 explicitamente (já está ao final do loop)
  return slots;
};

const SLOTS_INICIO = gerarSlotsInicio(); // 08:00 … 16:30
// Slots de fim são 30 minutos após cada início, último é 17:00
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
  /**
   * Recebe os dados preenchidos quando o usuário confirma.
   */
  onConfirm: (data: {
    sala: string;
    data: string;
    inicio: string;
    fim: string;
    nome: string;
    departamento: string;
  }) => void;
  /**
   * Valores iniciais opcionais (ex.: ao abrir a partir de um slot).
   */
  salaInicial?: string;
  dataInicial?: string;
  /**
   * Mensagem de erro externa (ex.: conflito de horário)
   */
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
  // ------------------------------- state -----------------------------------
  const today = new Date().toISOString().split("T")[0];
  const [sala, setSala] = useState(salaInicial ?? SALAS[0]);
  const [data, setData] = useState(dataInicial ?? today);
  const [inicio, setInicio] = useState(SLOTS_INICIO[0]);
  const [fim, setFim] = useState(SLOTS_FIM[0]);
  const [nome, setNome] = useState("");
  const [departamento, setDepartamento] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // garante que o fim esteja sempre > início
  useEffect(() => {
    const index = SLOTS_INICIO.indexOf(inicio);
    const novoFim = SLOTS_FIM[index] ?? SLOTS_FIM[SLOTS_FIM.length - 1];
    if (fim <= inicio) setFim(novoFim);
  }, [inicio]);

  // -------------------------- validação ---------------------------------
  const validar = () => {
    if (!nome.trim()) return "Nome é obrigatório";
    if (!departamento) return "Departamento é obrigatório";
    if (fim <= inicio) return "Horário de fim deve ser posterior ao início";
  };

  // --------------------------- submit -----------------------------------
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
        onConfirm({ sala, data, inicio, fim, nome, departamento });
        // Notify success via parent (ScheduleGrid) using its own notice state
        onClose();
      } catch (e) {
        setErro("Falha ao criar agendamento");
      } finally {
        setLoading(false);
      }
  };

  // --------------------------- JSX --------------------------------------
  return (
    <Modal open={open} onClose={onClose}>
      <ModalContent>
        <ModalHeader>Novo Agendamento</ModalHeader>
        <form onSubmit={handleSubmit}>
          <ModalBody className="flex flex-col gap-4">
            {/* Sala */}
            <label className="text-caption font-medium text-neutral-700">Sala</label>
            <select
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

            {/* Data */}
            <Input
              label="Data"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              min={today}
              required
            />

            {/* Horário início */}
            <label className="text-caption font-medium text-neutral-700">
              Horário início
            </label>
            <select
              className="flex h-10 w-full rounded-lg border bg-white px-3 text-body text-neutral-900 focus:outline-none focus:ring-2 focus:border-primary focus:ring-primary-100"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            >
              {SLOTS_INICIO.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* Horário fim */}
            <label className="text-caption font-medium text-neutral-700">
              Horário fim
            </label>
            <select
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

            {/* Nome */}
            <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />

            {/* Departamento */}
            <label className="text-caption font-medium text-neutral-700">
              Departamento
            </label>
            <select
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

            {erro && <p className="text-tiny text-danger-700">{erro}</p>}
    {externalError && (
      <p className="text-tiny text-red-600 font-medium">{externalError}</p>
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
