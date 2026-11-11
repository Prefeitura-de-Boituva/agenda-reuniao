import type { Room } from "@/types/schedule";

/**
 * Salas disponíveis na agenda.
 *
 * Os nomes espelham o enum `Sala` do contrato Prisma
 * (`src/prisma/contract.prisma`), porque é esse valor que a API recebe e grava
 * no banco. Os `id` são os slugs usados pela UI e pela URL (`?sala=sala-azul`).
 */
export const ROOMS: Room[] = [
  { id: "sala-azul", name: "Sala Azul" },
  { id: "sala-verde", name: "Sala Verde" },
  { id: "sala-amarela", name: "Sala Amarela" },
];
