import React from "react";
import { Tabs, TabItem } from "@/components/ui";

/**
 * Props for SalaTabs component.
 */
interface SalaTabsProps {
  /** Current selected sala (e.g., "Sala 1"). */
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
export const SalaTabs: React.FC<SalaTabsProps> = ({ selectedSala = "Sala 1", onSelect, className }) => {
  const tabs: TabItem[] = [
    { label: "Sala 1", value: "Sala 1" },
    { label: "Sala 2", value: "Sala 2" },
    { label: "Sala 3", value: "Sala 3" },
  ];

  return (
    <div className={className}>
      <Tabs tabs={tabs} activeTab={selectedSala} onChange={onSelect} />
    </div>
  );
};

export default SalaTabs;

