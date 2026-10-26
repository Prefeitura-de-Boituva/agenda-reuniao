import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchBookings } from "../bookings";

const agendamentoFazenda = {
  id: "abc-123",
  nome: "João",
  departamento: "Secretaria Municipal Fazenda, Desenvolvimento Econômico e Finanças",
  sala: "Sala Azul",
  data: "2026-09-20",
  horaInicio: "10:30",
  horaFim: "11:30",
  criadoEm: "2026-09-19T10:00:00.000Z",
};

const agendamentoJuridico = {
  id: "def-456",
  nome: "Maria",
  departamento: "Secretaria Municipal de Assuntos Jurídicos",
  sala: "Sala Azul",
  data: "2026-09-20",
  horaInicio: "09:00",
  horaFim: "10:00",
  criadoEm: "2026-09-19T10:00:00.000Z",
};

describe("fetchBookings", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("devolve somente os agendamentos reais da API, ordenados por horário", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify([agendamentoFazenda, agendamentoJuridico]), {
        status: 200,
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await fetchBookings("sala-azul", ["2026-09-20"]);

    // Sala da UI (slug) é convertida para o nome usado pela API
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/agendamentos?sala=Sala%20Azul&data=2026-09-20"
    );
    expect(resultado["2026-09-20"]).toEqual([
      {
        id: "def-456",
        roomId: "sala-azul",
        date: "2026-09-20",
        name: "Maria",
        department: "Secretaria Municipal de Assuntos Jurídicos",
        startTime: "09:00",
        endTime: "10:00",
      },
      {
        id: "abc-123",
        roomId: "sala-azul",
        date: "2026-09-20",
        name: "João",
        department:
          "Secretaria Municipal Fazenda, Desenvolvimento Econômico e Finanças",
        startTime: "10:30",
        endTime: "11:30",
      },
    ]);
  });

  it("devolve lista vazia para a data quando a API responde erro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{\"error\":\"...\"}", { status: 500 }))
    );

    const resultado = await fetchBookings("sala-azul", ["2026-09-20"]);

    expect(resultado["2026-09-20"]).toEqual([]);
  });

  it("devolve lista vazia quando a requisição falha (erro de rede)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    const resultado = await fetchBookings("sala-azul", ["2026-09-20"]);

    expect(resultado["2026-09-20"]).toEqual([]);
  });

  it("retorna objeto vazio quando a sala não existe", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await fetchBookings("sala-inexistente", ["2026-09-20"]);

    expect(resultado).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
