import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Porta de entrada da agenda: uma senha compartilhada pelo grupo, definida em
 * `ACCESS_PASSWORD`. Não há identidade por usuário — quem tem a senha pode
 * criar e cancelar reservas. O token do cookie é um HMAC da senha, então trocar
 * a senha invalida todos os cookies emitidos sem precisar de banco.
 *
 * O papel (issue #66) segue a mesma ideia: `ACCESS_PASSWORD_PREFEITO` é a senha
 * do Gabinete do Prefeito, e o token derivado dela vale `PREFEITO`. Como o papel
 * está no próprio token, não há sessão para consultar nem tabela de usuários.
 */

export const COOKIE_ACESSO = "agenda-acesso";

/** Papéis de acesso. `PREFEITO` é o único que pode criar Prioridade 0. */
export type Papel = "NORMAL" | "PREFEITO";

const PAPEIS: readonly Papel[] = ["NORMAL", "PREFEITO"];

/** Sete dias: cobre uma semana de sessões de validação sem re-login diário. */
export const DURACAO_ACESSO_SEGUNDOS = 7 * 24 * 60 * 60;

const ROTULO_TOKEN = "agenda-reuniao:acesso:v1";

function senhaDoPapel(papel: Papel): string | undefined {
  const valor =
    papel === "PREFEITO"
      ? process.env.ACCESS_PASSWORD_PREFEITO
      : process.env.ACCESS_PASSWORD;
  return valor ? valor : undefined;
}

function algumaSenhaConfigurada(): boolean {
  return PAPEIS.some((papel) => senhaDoPapel(papel) !== undefined);
}

/**
 * Sem nenhuma senha configurada o desenvolvimento fica aberto (o `npm run dev` e
 * os specs do Cypress não precisam de login), mas em produção o acesso fica
 * **fechado**: esquecer a env na Vercel não pode publicar a agenda na internet.
 */
export function acessoExigido(): boolean {
  return algumaSenhaConfigurada() || process.env.NODE_ENV === "production";
}

export function acessoConfigurado(): boolean {
  return algumaSenhaConfigurada();
}

export function tokenParaSenha(senha: string): string {
  return createHmac("sha256", senha).update(ROTULO_TOKEN).digest("hex");
}

function mesmoToken(recebido: string, esperado: string): boolean {
  const a = Buffer.from(recebido, "utf8");
  const b = Buffer.from(esperado, "utf8");
  // `timingSafeEqual` exige buffers do mesmo tamanho e lança se diferirem.
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Papel de um token de cookie, ou `null` quando não confere com nenhuma senha
 * configurada. `NORMAL` é testado antes: se as duas senhas forem iguais por
 * engano, ninguém é promovido a `PREFEITO`.
 */
export function papelDoToken(token: string | undefined): Papel | null {
  if (!token) return null;
  for (const papel of PAPEIS) {
    const senha = senhaDoPapel(papel);
    if (senha !== undefined && mesmoToken(token, tokenParaSenha(senha))) return papel;
  }
  return null;
}

export function tokenValido(token: string | undefined): boolean {
  return papelDoToken(token) !== null;
}

/** A senha informada é comparada pelo HMAC, em tempo constante. */
export function papelDaSenha(senha: string): Papel | null {
  return papelDoToken(tokenParaSenha(senha));
}

export function senhaCorreta(senha: string): boolean {
  return papelDaSenha(senha) !== null;
}

/** Somente o Gabinete do Prefeito cria agendamentos com Prioridade 0. */
export function permitePrioridadeZero(papel: Papel | null): boolean {
  return papel === "PREFEITO";
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
