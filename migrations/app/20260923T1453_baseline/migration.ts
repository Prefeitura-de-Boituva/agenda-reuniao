#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/b8d38441cacbdb69476901187e2efaf66da371d0076be1b8f09acaeb3921dffc/contract';
import endContract from '../../snapshots/b8d38441cacbdb69476901187e2efaf66da371d0076be1b8f09acaeb3921dffc/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'agendamento',
        columns: [
          col('criadoEm', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('data', 'date', { notNull: true, codecRef: { codecId: 'pg/date-string@1' } }),
          col('departamento', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('horaFim', 'character varying(5)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 5 } },
          }),
          col('horaInicio', 'character varying(5)', {
            notNull: true,
            codecRef: { codecId: 'sql/varchar@1', typeParams: { length: 5 } },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('nome', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('sala', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'agendamento_departamento_check_86dea612',
            "\"departamento\" IN ('Chefia de Gabinete', 'Secretaria Municipal Governo e Planejamento Estratégico', 'Secretaria Municipal de Assuntos Jurídicos', 'Secretaria Municipal Administração, Gestão e Equipe Públicos', 'Secretaria Municipal Fazenda, Desenvolvimento Econômico e Finanças', 'Secretaria Municipal Turismo, Juventude e Empreendedorismo', 'Secretaria Municipal Obras Públicas', 'Secretaria Municipal Planejamento Urbano e Habitação')",
          ),
          checkExpression(
            'agendamento_sala_check_d53f5364',
            "\"sala\" IN ('Sala 1', 'Sala 2', 'Sala 3')",
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'agendamento',
        constraint: 'agendamento_sala_data_horaInicio_key',
        columns: ['sala', 'data', 'horaInicio'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
