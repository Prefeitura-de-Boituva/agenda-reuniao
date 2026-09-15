import React from "react";

export interface TabItem {
  /** Display label */
  label: string;
  /** Value that represents the tab; can be any type the consumer wants */
  value: string;
}

export interface TabsProps {
  /** List of tabs to render */
  tabs: TabItem[];
  /** Currently selected tab value */
  activeTab: string;
  /** Callback when a tab is selected */
  onChange: (value: string) => void;
  /** Optional class name for the container */
  className?: string;
}

/**
 * Generic tab component. Renders a horizontally scrollable list of tabs.
 * The active tab receives a bottom border and a primary text colour.
 *
 * The component is deliberately lightweight – it does not manage its own
 * state; the parent must control the selected value via `activeTab` and
 * `onChange`. This keeps the component reusable across the codebase.
 */
export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className }) => {
  return (
    <div
      className={`flex w-full overflow-x-auto hide-scrollbar ${className ?? ""}`}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={`flex-1 whitespace-nowrap px-4 py-2 text-body transition-colors duration-150 focus:outline-none ${{
            // active style
            active: "border-b-2 border-primary text-primary",
            // inactive style
            inactive: "border-b-2 border-transparent text-neutral-600",
          }[tab.value === activeTab ? "active" : "inactive"]}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default Tabs;
