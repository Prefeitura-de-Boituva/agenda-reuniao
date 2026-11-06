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
 *
 * `bg`/`text` são a cor sólida e o texto sobre ela (botões da Grade);
 * `label` é o tom escuro usado quando a sala aparece como texto sobre o
 * tint `-50` da página (aba ativa do Início).
 */
interface RoomColor {
  bg: string;
  text: string;
  border: string;
  label: string;
}

export const ROOM_COLORS: Record<Room["id"], RoomColor> = {
  "sala-azul": {
    bg: "bg-primary-500",
    text: "text-white",
    border: "border-primary-500",
    label: "text-primary-700",
  },
  "sala-verde": {
    bg: "bg-success-500",
    text: "text-white",
    border: "border-success-500",
    label: "text-success-700",
  },
  "sala-amarela": {
    bg: "bg-warning-500",
    text: "text-neutral-900",
    border: "border-warning-500",
    label: "text-warning-700",
  },
};

/** Fundo que a página assume quando a sala está selecionada. */
const ROOM_TINTS: Record<Room["id"], string> = {
  "sala-azul": "bg-primary-50",
  "sala-verde": "bg-success-50",
  "sala-amarela": "bg-warning-50",
};

/** Classes de fundo que podem estar no `<body>` e precisam ser retiradas antes de aplicar o tint. */
const BODY_BG_CLASSES = [...Object.values(ROOM_TINTS), "bg-background", "bg-white"];

/**
 * Aplica o tint da sala ao `<body>`. Único lugar que mexe nessas classes: o
 * `globals.css` não define cor de fundo do body, então Início e Grade precisam
 * remover exatamente as mesmas classes uma da outra.
 */
export function applyRoomTint(roomId: string): void {
  const tint = ROOM_TINTS[roomId as Room["id"]] ?? ROOM_TINTS["sala-azul"];
  document.body.classList.remove(...BODY_BG_CLASSES);
  document.body.classList.add(tint);
}
