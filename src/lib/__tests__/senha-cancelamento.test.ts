import { describe, expect, it } from "vitest";
import {
  confereSenha,
  erroDaSenha,
  gerarHashSenha,
  normalizarSenha,
} from "@/lib/senhaCancelamento";

describe("senha de cancelamento", () => {
  it("guarda apenas o derivado, nunca a senha", async () => {
    const hash = await gerarHashSenha("senha-da-maria");

    expect(hash).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(hash).not.toContain("senha-da-maria");
  });

  it("compara pela senha normalizada", async () => {
    const hash = await gerarHashSenha("Água 12");

    // Caixa e acento não devem travar quem digita num teclado de celular.
    expect(await confereSenha("ÁGUA 12", hash)).toBe(true);
    expect(await confereSenha("  agua 12  ", hash)).toBe(true);
    expect(await confereSenha("agua12", hash)).toBe(false);
    expect(await confereSenha("senha-de-outra-pessoa", hash)).toBe(false);
  });

  it("usa salt próprio, então a mesma senha gera hashes diferentes", async () => {
    const primeiro = await gerarHashSenha("repetida");
    const segundo = await gerarHashSenha("repetida");

    expect(primeiro).not.toBe(segundo);
    expect(await confereSenha("repetida", primeiro)).toBe(true);
    expect(await confereSenha("repetida", segundo)).toBe(true);
  });

  it("devolve false para valor ausente ou fora do formato, sem lançar", async () => {
    expect(await confereSenha("qualquer", null)).toBe(false);
    expect(await confereSenha("qualquer", "")).toBe(false);
    expect(await confereSenha("qualquer", "texto-qualquer")).toBe(false);
    expect(await confereSenha("qualquer", "scrypt$16384$8$1$$")).toBe(false);
    expect(await confereSenha("qualquer", "sha256$a$b$c$d")).toBe(false);
  });

  it("mede o tamanho depois da normalização", () => {
    expect(erroDaSenha(normalizarSenha(" ab "))).toBe(
      "A senha deve ter ao menos 4 caracteres."
    );
    expect(erroDaSenha("abcd")).toBeNull();
    expect(erroDaSenha("a".repeat(65))).toBe(
      "A senha deve ter no máximo 64 caracteres."
    );
  });
});
