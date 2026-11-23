"use client";

import { useEffect, useState } from "react";

import type { Papel } from "./acesso";

/**
 * Papel da sessão, lido de `GET /api/acesso`. Enquanto a resposta não chega — ou
 * se a busca falha — vale `NORMAL`, de modo que o controle de Prioridade 0 nunca
 * aparece por omissão. A autoridade real é a API de agendamentos, que recheca o
 * papel no servidor; isto aqui só decide o que o formulário mostra.
 */
export function usePapel(): Papel {
  const [papel, setPapel] = useState<Papel>("NORMAL");

  useEffect(() => {
    let cancelado = false;
    fetch("/api/acesso")
      .then(async (res) => (res.ok ? ((await res.json()) as { papel?: string }) : {}))
      .then((resposta) => {
        if (!cancelado && resposta.papel === "PREFEITO") setPapel("PREFEITO");
      })
      .catch(() => {
        // sem sessão: continua NORMAL
      });
    return () => {
      cancelado = true;
    };
  }, []);

  return papel;
}
