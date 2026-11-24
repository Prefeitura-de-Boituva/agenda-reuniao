export const dynamic = "force-dynamic";

function autorizado(request: Request): boolean {
  const segredo = process.env["CRON_SECRET"];
  if (!segredo) return false;
  return request.headers.get("authorization") === `Bearer ${segredo}`;
}

export async function GET(request: Request): Promise<Response> {
  if (!autorizado(request)) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const { executarRetencaoAgendamentos } = await import("@/lib/retencao-agendamentos");
    // A automação começa deliberadamente em modo de observação. A exclusão
    // exige uma mudança explícita depois de revisar as contagens reportadas.
    const resultado = await executarRetencaoAgendamentos({ dryRun: true });
    console.info("[retencao] Execução concluída", resultado);
    return Response.json(resultado, { status: 200 });
  } catch (erro) {
    console.error("[retencao] Falha ao executar retenção de agendamentos.", erro);
    return Response.json({ error: "Falha ao executar a retenção." }, { status: 500 });
  }
}
