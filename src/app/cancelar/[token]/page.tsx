"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

type AgendamentoPublico = {
  nome: string;
  sala: string;
  data: string;
  horaInicio: string;
  horaFim: string;
};

export default function CancelarPorLinkPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState("");
  const [agendamento, setAgendamento] = useState<AgendamentoPublico | null>(null);
  const [podeCancelar, setPodeCancelar] = useState(false);
  const [mensagem, setMensagem] = useState("Carregando agendamento…");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    params.then(({ token: valor }) => {
      if (!ativo) return;
      setToken(valor);
      fetch(`/api/cancelamento/${encodeURIComponent(valor)}`)
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error ?? "Link inválido ou agendamento indisponível.");
          if (!ativo) return;
          setAgendamento(data.agendamento);
          setPodeCancelar(data.podeCancelar);
          setMensagem(data.podeCancelar ? "Confirme abaixo se deseja cancelar esta reserva." : "Não é possível cancelar reserva já encerrada.");
        })
        .catch((erro: unknown) => {
          if (ativo) setMensagem(erro instanceof Error ? erro.message : "Não foi possível consultar o link.");
        })
        .finally(() => { if (ativo) setCarregando(false); });
    });
    return () => { ativo = false; };
  }, [params]);

  const cancelar = async () => {
    setCarregando(true);
    try {
      const response = await fetch(`/api/cancelamento/${encodeURIComponent(token)}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmado: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Não foi possível cancelar.");
      setAgendamento(null);
      setPodeCancelar(false);
      setMensagem("Agendamento cancelado com sucesso.");
    } catch (erro) {
      setMensagem(erro instanceof Error ? erro.message : "Não foi possível cancelar.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-5 px-6 py-12">
      <h1 className="text-h2 font-bold text-neutral-900">Cancelar agendamento</h1>
      {agendamento && (
        <section className="rounded-xl border border-neutral-200 bg-white p-5 text-body text-neutral-700">
          <p><strong>Nome:</strong> {agendamento.nome}</p>
          <p><strong>Sala:</strong> {agendamento.sala}</p>
          <p><strong>Data:</strong> {agendamento.data}</p>
          <p><strong>Horário:</strong> {agendamento.horaInicio}–{agendamento.horaFim}</p>
        </section>
      )}
      <p role="status" className="text-body text-neutral-700">{mensagem}</p>
      {agendamento && podeCancelar && (
        <Button onClick={cancelar} disabled={carregando}>
          {carregando ? "Processando…" : "Confirmar cancelamento"}
        </Button>
      )}
    </main>
  );
}
