import type { Room } from "@/types/schedule";
import { SALAS } from "./agendamentoOpcoes";

/**
 * "Sala Azul" → "sala-azul": o slug usado pela UI e pela URL (`?room=sala-azul`).
 *
 * Acentos são removidos para que o slug continue válido se uma sala futura vier
 * com cedilha ou til no nome.
 */
function slugDaSala(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Salas disponíveis na agenda, derivadas de `SALAS` — a mesma lista que a API
 * usa para validar o corpo da requisição e que espelha o enum `Sala` do contrato
 * Prisma (`src/prisma/contract.prisma`).
 *
 * Derivar em vez de repetir os nomes é o que impede a contagem de salas da tela
 * inicial de divergir das salas que o sistema aceita gravar no banco.
 */
export const ROOMS: Room[] = SALAS.map((name) => ({ id: slugDaSala(name), name }));
