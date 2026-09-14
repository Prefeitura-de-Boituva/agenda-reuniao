"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-neutral-200 bg-white",
        className
      )}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold text-primary-800">
          <CalendarDays className="size-5" />
          <span className="text-body hidden sm:inline">Agenda de Reuniões</span>
          <span className="text-body sm:hidden">Agenda</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/"
            className="text-caption font-medium text-neutral-600 hover:text-primary-700 transition-colors duration-150"
          >
            Início
          </Link>
          <Link
            href="#"
            className="text-caption font-medium text-neutral-600 hover:text-primary-700 transition-colors duration-150"
          >
            Minhas Reuniões
          </Link>
        </nav>

        <button
          className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 md:hidden transition-colors duration-150"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
        >
          {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {menuOpen && (
        <nav className="border-t border-neutral-200 bg-white px-4 pb-4 pt-2 md:hidden">
          <Link
            href="/"
            className="block rounded-lg px-3 py-2 text-caption font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Início
          </Link>
          <Link
            href="#"
            className="block rounded-lg px-3 py-2 text-caption font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Minhas Reuniões
          </Link>
        </nav>
      )}
    </header>
  );
}