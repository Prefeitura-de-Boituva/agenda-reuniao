import { afterEach, describe, expect, it, vi } from "vitest";

import {
  acessoConfigurado,
  acessoExigido,
  destinoAposLogin,
  senhaCorreta,
  tokenParaSenha,
  tokenValido,
} from "../acesso";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("token de acesso", () => {
  it("aceita o token derivado da senha configurada", () => {
    vi.stubEnv("ACCESS_PASSWORD", "senha-do-grupo");
    expect(tokenValido(tokenParaSenha("senha-do-grupo"))).toBe(true);
  });

  it("rejeita senha errada, token vazio e token adulterado", () => {
    vi.stubEnv("ACCESS_PASSWORD", "senha-do-grupo");
    const token = tokenParaSenha("senha-do-grupo");
    expect(senhaCorreta("outra-senha")).toBe(false);
    expect(tokenValido(undefined)).toBe(false);
    expect(tokenValido("")).toBe(false);
    expect(tokenValido(`${token.slice(0, -1)}0`)).toBe(false);
    expect(tokenValido(token.slice(0, 10))).toBe(false);
  });

  it("trocar a senha invalida o token anterior", () => {
    vi.stubEnv("ACCESS_PASSWORD", "senha-antiga");
    const tokenAntigo = tokenParaSenha("senha-antiga");
    vi.stubEnv("ACCESS_PASSWORD", "senha-nova");
    expect(tokenValido(tokenAntigo)).toBe(false);
    expect(senhaCorreta("senha-nova")).toBe(true);
  });

  it("sem senha configurada nenhum token é aceito", () => {
    vi.stubEnv("ACCESS_PASSWORD", "");
    expect(acessoConfigurado()).toBe(false);
    expect(tokenValido(tokenParaSenha("qualquer"))).toBe(false);
    expect(senhaCorreta("qualquer")).toBe(false);
  });
});

describe("acessoExigido", () => {
  it("desenvolvimento sem senha fica aberto (dev e Cypress não logam)", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ACCESS_PASSWORD", "");
    expect(acessoExigido()).toBe(false);
  });

  it("produção sem senha fica FECHADA, não aberta", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ACCESS_PASSWORD", "");
    expect(acessoExigido()).toBe(true);
    expect(acessoConfigurado()).toBe(false);
  });

  it("com senha configurada o acesso é exigido em qualquer ambiente", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("ACCESS_PASSWORD", "senha-do-grupo");
    expect(acessoExigido()).toBe(true);
  });
});

describe("destinoAposLogin", () => {
  it("aceita caminhos internos, com query string", () => {
    expect(destinoAposLogin("/grade")).toBe("/grade");
    expect(destinoAposLogin("/grade?date=2026-11-10&room=sala-azul")).toBe(
      "/grade?date=2026-11-10&room=sala-azul"
    );
  });

  it("rejeita redirect aberto para outro host", () => {
    for (const valor of [
      "//evil.example",
      "/\\evil.example",
      "https://evil.example",
      "javascript:alert(1)",
    ]) {
      expect(destinoAposLogin(valor)).toBe("/");
    }
  });

  it("rejeita as variantes com caracteres de controle que o navegador normaliza", () => {
    expect(destinoAposLogin("/\t/evil.example")).toBe("/");
    expect(destinoAposLogin("/\n/evil.example")).toBe("/");
  });

  it("valor ausente ou de outro tipo volta para a home", () => {
    expect(destinoAposLogin(undefined)).toBe("/");
    expect(destinoAposLogin(null)).toBe("/");
    expect(destinoAposLogin(42)).toBe("/");
    expect(destinoAposLogin("")).toBe("/");
  });
});
