import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Header, MainContent } from "@/components/layout";

// Fontes embutidas no repositório: o build da imagem Docker não depende de
// acesso a fonts.googleapis.com (comum em redes restritas).
const geistSans = localFont({
  src: "./fonts/geist-latin.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-latin.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Agenda de Reuniões — Boituva",
  description:
    "Sistema de agendamento de salas de reunião da Prefeitura de Boituva",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Header />
        <MainContent>{children}</MainContent>
      </body>
    </html>
  );
}
