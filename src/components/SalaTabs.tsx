import React from "react";
import { Tabs, TabItem } from "@/components/ui";

/**
 * Props for SalaTabs component.
 */
interface SalaTabsProps {
  /** Current selected sala (e.g., "Sala AZul"). */
  selectedSala?: string;
  /** Callback when a sala is selected. */
  onSelect: (sala: string) => void;
  /** Optional className for container styling */
  className?: string;
}

/**
 * SalaTabs – wrapper around generic Tabs with three fixed rooms.
 * This component is fully controlled by its parent: the parent supplies
 * `selectedSala` (default "Sala 1") and receives updates via `onSelect`.
 */
export const SalaTabs: React.FC<SalaTabsProps> = ({ selectedSala = "Sala AZul", onSelect, className }) => {
  const tabs: TabItem[] = [
    { label: "Sala AZul", value: "Sala AZul" },
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

