/**
 * Tradução de falhas do Prisma 8 para as categorias que as rotas sabem
 * responder. A doc do pacote manda rotear pelo envelope/`sqlState` e nunca por
 * `instanceof`, então a checagem é estrutural e percorre a cadeia de `cause`:
 * o driver embute o erro do Postgres como `cause` do `SqlQueryError`.
 */

/** SQLSTATE padrão de `unique_violation`, normalizada pelo driver. */
const SQLSTATE_UNIQUE_VIOLATION = '23505';

/** Profundidade máxima da cadeia de `cause` inspectada, para não laçar em ciclos. */
const PROFUNDIDADE_MAXIMA = 6;

export type CategoriaErroDb = 'conflito' | 'config' | 'infra';

export const MSG_CONFLITO_HORARIO = 'Horário conflita com agendamento existente';

function ehViolacaoDeUnique(erro: unknown): boolean {
  let atual: unknown = erro;

  for (let profundidade = 0; atual && profundidade < PROFUNDIDADE_MAXIMA; profundidade += 1) {
    const candidatos = atual as { sqlState?: unknown; code?: unknown; cause?: unknown };
    if (
      candidatos.sqlState === SQLSTATE_UNIQUE_VIOLATION ||
      candidatos.code === SQLSTATE_UNIQUE_VIOLATION
    ) {
      return true;
    }
    atual = candidatos.cause;
  }

  return false;
}

export function categorizarErroDb(erro: unknown): CategoriaErroDb {
  if (ehViolacaoDeUnique(erro)) return 'conflito';
  // `db.ts` exige a URL na inicialização; manter a categoria config também
  // cobre erros lazy do runtime e deixa explícita a configuração ausente.
  return process.env['DATABASE_URL'] ? 'infra' : 'config';
}

export function registrarErroDb(erro: unknown, contexto: string): void {
  const categoria = categorizarErroDb(erro);
  const dica =
    categoria === 'config'
      ? ' DATABASE_URL não está definida; copie .env.example para .env.'
      : '';
  console.error(`[db] Falha ${categoria} em ${contexto}:${dica}`, erro);
}
