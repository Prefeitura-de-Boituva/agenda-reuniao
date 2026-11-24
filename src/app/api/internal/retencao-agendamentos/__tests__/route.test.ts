import { afterEach, describe, expect, it, vi } from "vitest";

const executarRetencao = vi.hoisted(() => vi.fn());
const registrarErro = vi.hoisted(() => vi.fn());

vi.mock("@/lib/retencao-agendamentos", () => ({
  executarRetencaoAgendamentos: executarRetencao,
}));
vi.mock("@/prisma/errors", () => ({ registrarErroDb: registrarErro }));

import { GET } from "../route";

describe("GET /api/internal/retencao-agendamentos", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("nega acesso sem CRON_SECRET", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const response = await GET(new Request("https://example.test/api/internal/retencao-agendamentos"));
    expect(response.status).toBe(401);
    expect(executarRetencao).not.toHaveBeenCalled();
  });

  it("executa dry-run por padrão com segredo válido", async () => {
    vi.stubEnv("CRON_SECRET", "segredo-teste");
    executarRetencao.mockResolvedValue({ dataLimite: "2026-01-15", dryRun: true, elegiveis: 3, removidos: 0 });

    const response = await GET(new Request("https://example.test/api/internal/retencao-agendamentos", {
      headers: { authorization: "Bearer segredo-teste" },
    }));

    expect(response.status).toBe(200);
    expect(executarRetencao).toHaveBeenCalledWith({ dryRun: true });
  });

  it("mantém o endpoint em dry-run mesmo que a query peça exclusão", async () => {
    vi.stubEnv("CRON_SECRET", "segredo-teste");
    executarRetencao.mockResolvedValue({ dataLimite: "2026-01-15", dryRun: true, elegiveis: 3, removidos: 0 });

    const response = await GET(new Request("https://example.test/api/internal/retencao-agendamentos?dryRun=false", {
      headers: { authorization: "Bearer segredo-teste" },
    }));

    expect(response.status).toBe(200);
    expect(executarRetencao).toHaveBeenCalledWith({ dryRun: true });
  });
});
