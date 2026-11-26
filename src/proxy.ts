import { NextResponse, type NextRequest } from "next/server";

import { COOKIE_ACESSO, acessoExigido, tokenValido } from "@/lib/acesso";

/**
 * Porta de entrada da aplicação (Next 16 chama de Proxy o antigo Middleware).
 * Roda no runtime Node.js por padrão nesta versão, então `node:crypto` do
 * `lib/acesso` está disponível aqui.
 */

/** Healthcheck do Docker e da Vercel não pode exigir senha. */
const ROTAS_PUBLICAS = ["/entrar", "/api/acesso", "/api/health"];

export default function proxy(request: NextRequest) {
  if (!acessoExigido()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (ROTAS_PUBLICAS.includes(pathname)) return NextResponse.next();
  if (tokenValido(request.cookies.get(COOKIE_ACESSO)?.value)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Acesso restrito. Entre com a senha do grupo." },
      { status: 401 }
    );
  }

  const destino = request.nextUrl.clone();
  destino.pathname = "/entrar";
  // A query vai junto: `/grade?date=…&room=…` precisa voltar para a mesma semana
  // e sala depois do login, não para a grade padrão.
  destino.search = `?prox=${encodeURIComponent(pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(destino);
}

export const config = {
  // Sem excluir os assets, a porta bloquearia o CSS/JS/fontes da própria tela
  // de login e a página ficaria sem estilo.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js|map|txt|xml|webmanifest|woff|woff2)$).*)",
  ],
};
