import { describe, it, expect } from "vitest";
import { ROOMS } from "../rooms";
import { SALAS } from "../agendamentoOpcoes";
import { ROOM_COLORS } from "../room-colors";

describe("ROOMS", () => {
  it("deriva as salas da mesma lista que a API valida", () => {
    expect(ROOMS.map((room) => room.name)).toEqual([...SALAS]);
  });

  it("mantém os slugs usados pela UI e pela URL", () => {
    expect(ROOMS.map((room) => room.id)).toEqual([
      "sala-azul",
      "sala-verde",
      "sala-amarela",
    ]);
  });

  it("dá a toda sala uma cor própria em vez de cair no fallback", () => {
    for (const room of ROOMS) {
      expect(Object.keys(ROOM_COLORS)).toContain(room.id);
    }
  });
});
