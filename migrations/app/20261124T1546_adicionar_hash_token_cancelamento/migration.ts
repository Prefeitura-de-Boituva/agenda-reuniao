#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1eb38c2822b829bb28cc718281e5a2d27f3ac2b9d7fcba5392080fa07c13537c/contract';
import endContract from '../../snapshots/1eb38c2822b829bb28cc718281e5a2d27f3ac2b9d7fcba5392080fa07c13537c/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/ca204f28bb9bd19f3bf82672d05df7c91ab78b3791253d5ea489d1901e28dfcc/contract';
import startContract from '../../snapshots/ca204f28bb9bd19f3bf82672d05df7c91ab78b3791253d5ea489d1901e28dfcc/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'agendamento',
        column: col('cancelamentoTokenHash', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'agendamento',
        constraint: 'agendamento_cancelamentoTokenHash_key',
        columns: ['cancelamentoTokenHash'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
