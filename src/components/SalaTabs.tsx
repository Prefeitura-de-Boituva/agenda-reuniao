import React from "react";
import { Tabs, TabItem } from "@/components/ui";

/**
 * Props for SalaTabs component.
 */
interface SalaTabsProps {
<<<<<<< HEAD
  /** Current selected sala (e.g., "Sala AZul"). */
=======
  /** Current selected sala (e.g., "Sala Azul"). */
>>>>>>> ab0f4558c9df1ae05eb276b326f88b60300fb343
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
 */
<<<<<<< HEAD
export const SalaTabs: React.FC<SalaTabsProps> = ({ selectedSala = "Sala AZul", onSelect, className }) => {
  const tabs: TabItem[] = [
    { label: "Sala AZul", value: "Sala AZul" },
=======
export const SalaTabs: React.FC<SalaTabsProps> = ({ selectedSala = "Sala Azul", onSelect, className }) => {
  const tabs: TabItem[] = [
    { label: "Sala Azul", value: "Sala Azul" },
>>>>>>> ab0f4558c9df1ae05eb276b326f88b60300fb343
    { label: "Sala Verde", value: "Sala Verde" },
    { label: "Sala Amarela", value: "Sala Amarela" },
  ];

  return (
    <div className={className}>
      <Tabs tabs={tabs} activeTab={selectedSala} onChange={onSelect} />
    </div>
  );
};

export default SalaTabs;

