"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, Input } from "@/components/ui";

export function FormularioEntrar({ destino }: { destino: string }) {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEnviando(true);
    setErro(null);

    try {
      const resposta = await fetch("/api/acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      const corpo: { error?: string } = await resposta
        .json()
        .catch(() => ({} as { error?: string }));

      if (!resposta.ok) {
        setErro(corpo.error ?? "Não foi possível entrar.");
        return;
      }

      router.replace(destino);
      router.refresh();
    } catch {
      setErro("Falha de rede ao entrar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={entrar} className="flex w-full max-w-sm flex-col gap-4">
      <Input
        id="senha-acesso"
        name="senha"
        type="password"
        label="Senha do grupo"
        autoComplete="current-password"
        value={senha}
        onChange={(evento) => {
          setSenha(evento.target.value);
          if (erro) setErro(null);
        }}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? "erro-acesso" : undefined}
        disabled={enviando}
        required
      />
      {/* O `Input` não recebe `error`: ele renderizaria a mesma mensagem uma
          segunda vez, sem `role="alert"`. */}
      {erro && (
        <p id="erro-acesso" role="alert" className="text-tiny text-danger-700">
          {erro}
        </p>
      )}
      <Button type="submit" loading={enviando} disabled={senha.trim() === ""}>
        Entrar
      </Button>
    </form>
  );
}
