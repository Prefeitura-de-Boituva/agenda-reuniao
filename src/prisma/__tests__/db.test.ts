import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../db";

const agendamento = {
  id: "abc-123",
  nome: "João",
  departamento: "Secretaria Municipal Fazenda, Desenvolvimento Econômico e Finanças",
  sala: "Sala Azul",
  data: "2026-09-20",
  horaInicio: "10:30",
  horaFim: "11:30",
  criadoEm: "2026-09-19T10:00:00.000Z",
};

describe("mock db.orm.public.Agendamento", () => {
  beforeEach(() => {
    // limpa o store em memória entre testes
    db.orm.public._store.length = 0;
  });

  it("first() retorna o registro pelo id", async () => {
    await db.orm.public.Agendamento.create(agendamento);

    const found = await db.orm.public.Agendamento.where({ id: "abc-123" }).first();

    expect(found?.id).toBe("abc-123");
  });

  it("first() retorna null quando o id não existe", async () => {
    const found = await db.orm.public.Agendamento.where({ id: "nao-existe" }).first();

    expect(found).toBeNull();
  });

  it("delete() remove o registro e o retorna", async () => {
    await db.orm.public.Agendamento.create(agendamento);

    const deleted = await db.orm.public.Agendamento.where({ id: "abc-123" }).delete();

    expect(deleted?.id).toBe("abc-123");
    const after = await db.orm.public.Agendamento.where({ id: "abc-123" }).first();
    expect(after).toBeNull();
  });

  it("where({ sala, data }).orderBy() continua filtrando (usado por GET/conflito)", async () => {
    await db.orm.public.Agendamento.create(agendamento);

    const list = await db.orm.public.Agendamento.where({
      sala: "Sala Azul",
      data: "2026-09-20",
    }).orderBy({ horaInicio: "asc" });

    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("abc-123");
  });
});