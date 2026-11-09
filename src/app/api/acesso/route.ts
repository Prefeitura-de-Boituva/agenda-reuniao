import { cookies } from "next/headers";

import {
  COOKIE_ACESSO,
  DURACAO_ACESSO_SEGUNDOS,
  acessoConfigurado,
  senhaCorreta,
  tokenParaSenha,
} from "@/lib/acesso";

export async function POST(request: Request) {
  if (!acessoConfigurado()) {
    return Response.json(
      { error: "Acesso não configurado neste ambiente. Defina ACCESS_PASSWORD." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const senha = (body as { senha?: unknown })?.senha;
  if (typeof senha !== "string" || senha.trim() === "") {
    return Response.json({ error: "Informe a senha do grupo." }, { status: 400 });
  }

  if (!senhaCorreta(senha)) {
    return Response.json({ error: "Senha incorreta." }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_ACESSO, tokenParaSenha(senha), {
    httpOnly: true,
    // A mesma imagem roda em HTTPS (Vercel) e em HTTP na rede interna; marcar
    // `secure` no segundo caso impediria o cookie de voltar e o login nunca
    // "pegaria".
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_ACESSO_SEGUNDOS,
  });

  return Response.json({ ok: true });
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_ACESSO);
  return Response.json({ ok: true });
}
