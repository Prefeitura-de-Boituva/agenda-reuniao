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

describe("fetchBookings", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("consome GET /api/agendamentos com sala (nome) e data e mapeia para Booking", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify([agendamentoFazenda]), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await fetchBookings("sala-azul", ["2026-09-20"]);

    // Sala da UI (slug) é convertida para o nome usado pela API
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/agendamentos?sala=Sala%20Azul&data=2026-09-20"
    );
    expect(resultado["2026-09-20"]).toEqual([
      {
        id: "abc-123",
        roomId: "sala-azul",
        date: "2026-09-20",
        name: "João",
        department: "Secretaria Municipal Fazenda, Desenvolvimento Econômico e Finanças",
        startTime: "10:30",
        endTime: "11:30",
      },
    ]);
  });

  it("retorna lista vazia quando a API responde com erro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{\"error\":\"...\"}", { status: 500 }))
    );

    const resultado = await fetchBookings("sala-azul", ["2026-09-20"]);

    expect(resultado["2026-09-20"]).toEqual([]);
  });

  it("retorna lista vazia quando a sala não existe", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await fetchBookings("sala-inexistente", ["2026-09-20"]);

    expect(resultado).toEqual({});
    expect(fetchMock).not.toHaveBeenCalled();
  });
});