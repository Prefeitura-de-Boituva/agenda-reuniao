import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Porta de entrada da agenda: uma senha compartilhada pelo grupo, definida em
 * `ACCESS_PASSWORD`. Não há identidade por usuário — quem tem a senha pode
 * criar e cancelar reservas. O token do cookie é um HMAC da senha, então trocar
 * a senha invalida todos os cookies emitidos sem precisar de banco.
 */

export const COOKIE_ACESSO = "agenda-acesso";

/** Sete dias: cobre uma semana de sessões de validação sem re-login diário. */
export const DURACAO_ACESSO_SEGUNDOS = 7 * 24 * 60 * 60;

const ROTULO_TOKEN = "agenda-reuniao:acesso:v1";

function senhaConfigurada(): string | undefined {
  const valor = process.env.ACCESS_PASSWORD;
  return valor ? valor : undefined;
}

/**
 * Sem `ACCESS_PASSWORD` o desenvolvimento fica aberto (o `npm run dev` e os
 * specs do Cypress não precisam de login), mas em produção o acesso fica
 * **fechado**: esquecer a env na Vercel não pode publicar a agenda na internet.
 */
export function acessoExigido(): boolean {
  return senhaConfigurada() !== undefined || process.env.NODE_ENV === "production";
}

export function acessoConfigurado(): boolean {
  return senhaConfigurada() !== undefined;
}

export function tokenParaSenha(senha: string): string {
  return createHmac("sha256", senha).update(ROTULO_TOKEN).digest("hex");
}

function tokenEsperado(): string | null {
  const senha = senhaConfigurada();
  return senha === undefined ? null : tokenParaSenha(senha);
}

export function tokenValido(token: string | undefined): boolean {
  const esperado = tokenEsperado();
  if (esperado === null || !token) return false;

  const recebido = Buffer.from(token, "utf8");
  const correto = Buffer.from(esperado, "utf8");
  // `timingSafeEqual` exige buffers do mesmo tamanho e lança se diferirem.
  return recebido.length === correto.length && timingSafeEqual(recebido, correto);
}

/** A senha informada é comparada pelo HMAC, em tempo constante. */
export function senhaCorreta(senha: string): boolean {
  return tokenValido(tokenParaSenha(senha));
}

/**
 * Para onde mandar o usuário depois do login. O `prox` vem da query string,
 * então só caminhos internos são aceitos: `//outro.site` e `/\outro.site` — e as
 * variantes com tab/quebra de linha, que o navegador normaliza — seriam um
 * redirect aberto para fora da aplicação.
 */
export function destinoAposLogin(valor: unknown): string {
  if (typeof valor !== "string") return "/";

  const caminho = valor.replace(/[\x00-\x1f\x7f]/g, "");
  if (!caminho.startsWith("/") || caminho.startsWith("//") || caminho.includes("\\")) {
    return "/";
  }
  return caminho;
}
