"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeaderProps {
  className?: string;
}

const NAV_LINKS = [
  { href: "/", label: "Início" },
  { href: "/grade", label: "Grade de Horários" },
];

export function Header({ className }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-primary-950 bg-primary-800 text-white",
        className
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold text-white">
          <CalendarDays className="size-5" />
          <span className="text-body hidden sm:inline">Agenda de Reuniões</span>
          <span className="text-body sm:hidden">Agenda</span>
        </Link>

        <nav className="hidden h-full items-stretch gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center px-3 text-caption font-medium transition-colors duration-150",
                isActive(link.href)
                  ? "border-b-2 border-white text-white"
                  : "border-b-2 border-transparent text-primary-100 hover:text-white"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          className="rounded-lg p-2 text-primary-100 hover:bg-primary-700 hover:text-white md:hidden transition-colors duration-150"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {menuOpen && (
        <nav className="border-t border-primary-700 bg-primary-800 px-4 pb-4 pt-2 md:hidden">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={cn(
                "block rounded-lg px-3 py-2 text-caption font-medium transition-colors duration-150",
                isActive(link.href)
                  ? "bg-primary-700 text-white"
                  : "text-primary-100 hover:bg-primary-700 hover:text-white"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}