import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { categorizarErroDb, registrarErroDb } from "../errors";

/**
 * Os shapes abaixo são cópias do que o probe contra o Neon registrou (issue
 * #48): o `SqlQueryError` do Prisma 8 no topo e o `DatabaseError` do
 * node-postgres como `cause`. O mapper é estrutural de propósito — a classe
 * `SqlQueryError` não é exportada por um subpath público do
 * `@prisma/orm-postgres`, então nada aqui depende de `instanceof`.
 */
const erroUniqueDoPrisma = () => {
  const causa = Object.assign(
    new Error('duplicate key value violates unique constraint "agendamento_sala_data_horaInicio_key"'),
    { name: "error", code: "23505", constraint: "agendamento_sala_data_horaInicio_key" }
  );
  return Object.assign(
    new Error('duplicate key value violates unique constraint "agendamento_sala_data_horaInicio_key"', {
      cause: causa,
    }),
    {
      name: "SqlQueryError",
      kind: "sql_query",
      sqlState: "23505",
      constraint: "agendamento_sala_data_horaInicio_key",
      table: "agendamento",
    }
  );
};

describe("categorizarErroDb", () => {
  beforeEach(() => {
    // Categoria 'infra' é o padrão só quando a URL existe; fixar aqui evita
    // que a suíte dependa de o `.env` local estar carregado no vitest.
    vi.stubEnv("DATABASE_URL", "postgresql://usuario@host:5432/db");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("classifica violação de unique pelo sqlState no topo", () => {
    expect(categorizarErroDb(erroUniqueDoPrisma())).toBe("conflito");
  });

  it("classifica quando o 23505 só aparece no cause (shape do driver)", () => {
    const causa = Object.assign(new Error("duplicate key"), { code: "23505" });
    const erro = Object.assign(new Error("falha ao inserir", { cause: causa }), {
      code: "CONTRACT.MARKER_READ_FAILED",
    });

    expect(categorizarErroDb(erro)).toBe("conflito");
  });

  it("não confunde outro sqlState com conflito", () => {
    const erro = Object.assign(new Error("violation of foreign key"), { sqlState: "23503" });

    expect(categorizarErroDb(erro)).toBe("infra");
  });

  it("trata falha comum de conexão como infra quando a URL está configurada", () => {
    expect(categorizarErroDb(new Error("connection refused"))).toBe("infra");
  });

  it("trata falha qualquer como config quando DATABASE_URL não existe", () => {
    vi.stubEnv("DATABASE_URL", "");

    expect(categorizarErroDb(new Error("driver not connected"))).toBe("config");
  });

  it("não laça em cadeias de cause circulares", () => {
    const a = new Error("a");
    const b = new Error("b", { cause: a });
    (a as Error & { cause?: Error }).cause = b;

    expect(categorizarErroDb(a)).toBe("infra");
  });

  it("ignora valores não-erro vindos do banco", () => {
    expect(categorizarErroDb(undefined)).toBe("infra");
    expect(categorizarErroDb("string de erro")).toBe("infra");
  });
});

describe("registrarErroDb", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("aponta a ausência de DATABASE_URL no log, sem expor a URL", () => {
    const erro = new Error("Postgres driver not connected");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("DATABASE_URL", "");

    registrarErroDb(erro, "POST /api/agendamentos");

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("DATABASE_URL não está definida"),
      erro
    );
    expect(consoleError.mock.calls[0][0]).not.toContain("postgresql://");
    consoleError.mockRestore();
  });

  it("registra a categoria e o contexto para falhas de infraestrutura", () => {
    const erro = Object.assign(new Error("connection terminated"), { sqlState: "08006" });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("DATABASE_URL", "postgresql://usuario@host:5432/db");

    registrarErroDb(erro, "GET /api/agendamentos");

    expect(consoleError).toHaveBeenCalledWith(
      "[db] Falha infra em GET /api/agendamentos:",
      erro
    );
    consoleError.mockRestore();
  });
});
