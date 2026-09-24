import { describe, it, expect, vi, afterEach } from "vitest";
import { cancelarAgendamento, ApiError } from "../apiClient";

describe("cancelarAgendamento", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("chama DELETE /api/agendamentos/[id] com o departamento no body", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ message: "Agendamento cancelado com sucesso." }),
          { status: 200 }
        )
    );
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await cancelarAgendamento("abc-123", "Fazenda");

    expect(resultado.message).toBe("Agendamento cancelado com sucesso.");
    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/agendamentos/abc-123");
    expect(options.method).toBe("DELETE");
    expect(JSON.parse(String(options.body)).departamento).toBe("Fazenda");
  });

  it("lança ApiError com status 404 quando o agendamento não existe", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ error: "Agendamento não encontrado." }),
            { status: 404 }
          )
      )
    );

    await expect(cancelarAgendamento("abc-123", "Fazenda")).rejects.toMatchObject({
      status: 404,
      message: "Agendamento não encontrado.",
    });
  });

  it("lança ApiError com status 403 quando o departamento não confere", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: "Departamento não autorizado a cancelar este agendamento.",
            }),
            { status: 403 }
          )
      )
    );

    const erro = await cancelarAgendamento("abc-123", "Errado").catch((e) => e);
    expect(erro).toBeInstanceOf(ApiError);
    expect(erro.status).toBe(403);
  });
});