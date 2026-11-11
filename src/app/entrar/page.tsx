import type { Metadata } from "next";

import { FormularioEntrar } from "@/components/acesso/FormularioEntrar";
import { destinoAposLogin } from "@/lib/acesso";

export const metadata: Metadata = {
  title: "Entrar — Agenda de Reuniões",
};

export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ prox?: string }>;
}) {
  const { prox } = await searchParams;

  return (
    <div className="flex flex-col items-center gap-4 py-16">
      <h1 className="text-h3 font-semibold text-neutral-900">Agenda de Reuniões</h1>
      <p className="max-w-sm text-center text-body text-neutral-600">
        Acesso restrito aos colaboradores da Prefeitura de Boituva. Use a senha
        combinada com o grupo.
      </p>
      <FormularioEntrar destino={destinoAposLogin(prox)} />
    </div>
  );
}
