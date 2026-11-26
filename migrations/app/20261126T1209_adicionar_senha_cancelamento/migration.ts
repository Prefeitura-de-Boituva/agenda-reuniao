#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/ca204f28bb9bd19f3bf82672d05df7c91ab78b3791253d5ea489d1901e28dfcc/contract';
import startContract from '../../snapshots/ca204f28bb9bd19f3bf82672d05df7c91ab78b3791253d5ea489d1901e28dfcc/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/eeb525f4604698103fccffc85c1f42d4cd7567d0df1a75d4bcdb2b7b7ad264f9/contract';
import endContract from '../../snapshots/eeb525f4604698103fccffc85c1f42d4cd7567d0df1a75d4bcdb2b7b7ad264f9/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'agendamento',
        column: col('cancelamentoSenha', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
