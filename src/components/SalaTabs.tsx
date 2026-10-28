import React from "react";
import { Tabs, TabItem } from "@/components/ui";
import { ROOM_COLORS } from "@/lib/room-colors";

/** Mapeia o nome da sala (ex.: "Sala Azul") para o id usado nas cores. */
const SALA_TO_ID: Record<string, string> = {
  "Sala Azul": "sala-azul",
  "Sala Verde": "sala-verde",
  "Sala Amarela": "sala-amarela",
};


/**
 * Props for SalaTabs component.
 */
interface SalaTabsProps {
/** Current selected sala (e.g., "Sala Azul"). */
  selectedSala?: string;
  /** Callback when a sala is selected. */
  onSelect: (sala: string) => void;
  /** Optional className for container styling */
  className?: string;
}

/**
 * SalaTabs – wrapper around generic Tabs with three fixed rooms.
 * This component is fully controlled by its parent: the parent supplies
 * `selectedSala` (default "Sala Azul") and receives updates via `onSelect`.
 * The active tab underline/text color follows the room's design-system color.
 */
export const SalaTabs: React.FC<SalaTabsProps> = ({ selectedSala = "Sala Azul", onSelect, className }) => {
    const tabs: TabItem[] = [
      { label: "Sala Azul", value: "Sala Azul" },
      { label: "Sala Verde", value: "Sala Verde" },
      { label: "Sala Amarela", value: "Sala Amarela" },
    ];

  const colorId = SALA_TO_ID[selectedSala] ?? "sala-azul";
  const color = ROOM_COLORS[colorId] ?? ROOM_COLORS["sala-azul"];

  return (
    <div className={className}>
      <Tabs
        tabs={tabs}
        activeTab={selectedSala}
        onChange={onSelect}
        activeTabClassName={`border-b-2 ${color.border} text-neutral-900`}
      />
    </div>
  );
};

export default SalaTabs;

