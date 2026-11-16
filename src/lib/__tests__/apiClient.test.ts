import { describe, it, expect, vi, afterEach } from "vitest";
import { cancelarAgendamento, editarAgendamento, ApiError } from "../apiClient";

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

describe("editarAgendamento", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const dados = {
    nome: "Reunião remarcada",
    departamento: "Chefia de Gabinete",
    horaInicio: "14:00",
    horaFim: "15:30",
  };

  it("chama PUT /api/agendamentos/[id] com os campos editáveis", async () => {
    const fetchMock = vi.fn(
      async () => new Response(JSON.stringify({ id: "abc-123", ...dados }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await editarAgendamento("abc-123", dados);

    expect(resultado.horaInicio).toBe("14:00");
    const [url, options] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/agendamentos/abc-123");
    expect(options.method).toBe("PUT");
    expect(JSON.parse(String(options.body))).toEqual(dados);
  });

  it("lança ApiError com a mensagem do servidor quando há conflito", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ error: "Horário conflita com agendamento existente" }),
            { status: 409 }
          )
      )
    );

    await expect(editarAgendamento("abc-123", dados)).rejects.toMatchObject({
      status: 409,
      message: "Horário conflita com agendamento existente",
    });
  });
});