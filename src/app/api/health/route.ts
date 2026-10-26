/**
 * Healthcheck de liveness usado pelo `docker-compose.prod.yml`.
 *
 * Por padrão NÃO consulta o banco: o Neon suspende após um período de
 * inatividade e uma checagem a cada 30s impediria essa suspensão. Use
 * `?db=1` para validar a conexão manualmente (ex.: depois de aplicar
 * migrations ou investigar um incidente).
 */
export const dynamic = "force-dynamic";

type HealthBody = {
  status: "ok" | "error";
  uptime: number;
  timestamp: string;
  database?: "ok" | "error";
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const checarBanco = searchParams.get("db") === "1";

  const body: HealthBody = {
    status: "ok",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };

  if (!checarBanco) {
    return Response.json(body, { status: 200 });
  }

  try {
    // Import dinâmico: o cliente Prisma só é avaliado quando a checagem de
    // banco é solicitada, mantendo o liveness barato.
    const { db } = await import("@/prisma/db");
    // Busca por um id inexistente: exercita conexão/consulta sem ler dados.
    await db.orm.public.Agendamento.where({ id: crypto.randomUUID() }).all();
    body.database = "ok";
    return Response.json(body, { status: 200 });
  } catch {
    body.status = "error";
    body.database = "error";
    return Response.json(body, { status: 503 });
  }
}
