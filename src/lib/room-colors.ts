import type { Room } from "@/types/schedule";

/**
 * Mapeia cada sala para as classes de cor do design system.
 *
 * - sala-azul   → primary (azul)
 * - sala-verde  → success (verde)
 * - sala-amarela → warning (amarelo)
 *
 * Estas classes seguem os tons já definidos em `src/app/globals.css`
 * (primary-500, success-500, warning-500) e são compartilhadas entre
 * a página inicial (`SalaTabs`) e a Grade de Horários.
 */
export const ROOM_COLORS: Record<Room["id"], { bg: string; text: string; border: string }> = {
  "sala-azul": {
    bg: "bg-primary-500",
    text: "text-white",
    border: "border-primary-500",
  },
  "sala-verde": {
    bg: "bg-success-500",
    text: "text-white",
    border: "border-success-500",
  },
  "sala-amarela": {
    bg: "bg-warning-500",
    text: "text-neutral-900",
    border: "border-warning-500",
  },
} as const;
