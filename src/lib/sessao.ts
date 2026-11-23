import { cookies } from "next/headers";

import { COOKIE_ACESSO, papelDoToken, type Papel } from "./acesso";

/**
 * Papel de quem fez a requisição. Separado de `lib/acesso` porque lê
 * `next/headers`, que não está disponível no Proxy (`src/proxy.ts`) — lá o papel
 * sai direto de `request.cookies`.
 *
 * Sem cookie (desenvolvimento aberto, ou sessão expirada) o papel é `NORMAL`:
 * a Prioridade 0 nunca é liberada por omissão.
 */
export async function papelDaRequisicao(): Promise<Papel> {
  const cookieStore = await cookies();
  return papelDoToken(cookieStore.get(COOKIE_ACESSO)?.value) ?? "NORMAL";
}
