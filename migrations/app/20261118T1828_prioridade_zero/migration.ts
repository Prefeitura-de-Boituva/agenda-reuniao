#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/9a35bb6c32be20950956492551fea7afc8710a9e761bcde67a060f9e69ef2572/contract';
import endContract from '../../snapshots/9a35bb6c32be20950956492551fea7afc8710a9e761bcde67a060f9e69ef2572/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ca204f28bb9bd19f3bf82672d05df7c91ab78b3791253d5ea489d1901e28dfcc/contract';
import startContract from '../../snapshots/ca204f28bb9bd19f3bf82672d05df7c91ab78b3791253d5ea489d1901e28dfcc/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit, rawSql } from '@prisma/orm-postgres/migration';

const constraintSobreposicao = (prioridade: 'NORMAL' | 'PREFEITO') => {
  const nome = `agendamento_sem_sobreposicao_${prioridade.toLowerCase()}`;
  return rawSql({
    id: `rawSql.agendamento.${nome}`,
    label: `Add overlap exclusion constraint "${nome}" on "agendamento"`,
    operationClass: 'additive',
    target: {
      id: 'postgres',
      details: {
        schema: 'public',
        objectType: 'unique',
        name: nome,
        table: 'agendamento',
      },
    },
    precheck: [],
    execute: [
      {
        description: `Block overlapping ${prioridade} bookings in the same room and date`,
        // Horários são varchar; numrange evita casts de tempo não imutáveis no índice.
        sql:
          `ALTER TABLE "public"."agendamento" ` +
          `ADD CONSTRAINT "${nome}" EXCLUDE USING gist (` +
          `"sala" WITH =, ` +
          `"data" WITH =, ` +
          `numrange(` +
          `(split_part("horaInicio", ':', 1)::int * 60 + split_part("horaInicio", ':', 2)::int), ` +
          `(split_part("horaFim", ':', 1)::int * 60 + split_part("horaFim", ':', 2)::int), ` +
          `'[)') WITH &&` +
          `) WHERE ("prioridade" = '${prioridade}')`,
      },
    ],
    postcheck: [],
  });
};

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      rawSql({
        id: 'rawSql.extension.btree_gist',
        label: 'Install extension "btree_gist"',
        operationClass: 'additive',
        target: {
          id: 'postgres',
          details: {
            schema: 'public',
            objectType: 'dependency',
            name: 'btree_gist',
          },
        },
        precheck: [],
        execute: [
          {
            description: 'Enable equality operators for text and date in GiST exclusion constraints',
            sql: 'CREATE EXTENSION IF NOT EXISTS "btree_gist"',
          },
        ],
        postcheck: [],
      }),
      this.dropConstraint({
        schema: 'public',
        table: 'agendamento',
        constraint: 'agendamento_sala_data_horaInicio_key',
      }),
      this.addColumn({
        schema: 'public',
        table: 'agendamento',
        column: col('prioridade', 'text', {
          notNull: true,
          default: lit('NORMAL'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'agendamento',
        constraint: 'agendamento_prioridade_check_463c2d12',
        expression: "\"prioridade\" IN ('NORMAL', 'PREFEITO')",
      }),
      this.addUnique({
        schema: 'public',
        table: 'agendamento',
        constraint: 'agendamento_sala_data_horaInicio_prioridade_key',
        columns: ['sala', 'data', 'horaInicio', 'prioridade'],
      }),
      constraintSobreposicao('NORMAL'),
      constraintSobreposicao('PREFEITO'),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
