#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/b8d38441cacbdb69476901187e2efaf66da371d0076be1b8f09acaeb3921dffc/contract';
import startContract from '../../snapshots/b8d38441cacbdb69476901187e2efaf66da371d0076be1b8f09acaeb3921dffc/contract.json' with { type: 'json' };
import type { Contract as End, Models } from '../../snapshots/ca204f28bb9bd19f3bf82672d05df7c91ab78b3791253d5ea489d1901e28dfcc/contract';
import endContract from '../../snapshots/ca204f28bb9bd19f3bf82672d05df7c91ab78b3791253d5ea489d1901e28dfcc/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';
import postgres from '@prisma/orm-postgres/runtime';

const { sql, contract } = postgres<End>({ contractJson: endContract });

type Sala = Models.public_Agendamento['sala'];
/**
 * Os valores antigos ("Sala 1"/"Sala 2"/"Sala 3") não existem no contrato de
 * destino, então o cast é apenas para satisfazer a tipagem do filtro — o SQL
 * emitido usa o valor literal normalmente.
 */
const valorAntigo = (valor: string): Sala => valor as unknown as Sala;

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.dropCheckConstraint({
        schema: 'public',
        table: 'agendamento',
        constraint: 'agendamento_sala_check_d53f5364',
      }),
      this.dataTransform(contract, 'renomear-sala-1-para-azul', {
        check: () =>
          sql.public.agendamento
            .select('id')
            .where((f, fns) => fns.eq(f.sala, valorAntigo('Sala 1')))
            .limit(1),
        run: () =>
          sql.public.agendamento
            .update({ sala: 'Sala Azul' })
            .where((f, fns) => fns.eq(f.sala, valorAntigo('Sala 1'))),
      }),
      this.dataTransform(contract, 'renomear-sala-2-para-verde', {
        check: () =>
          sql.public.agendamento
            .select('id')
            .where((f, fns) => fns.eq(f.sala, valorAntigo('Sala 2')))
            .limit(1),
        run: () =>
          sql.public.agendamento
            .update({ sala: 'Sala Verde' })
            .where((f, fns) => fns.eq(f.sala, valorAntigo('Sala 2'))),
      }),
      this.dataTransform(contract, 'renomear-sala-3-para-amarela', {
        check: () =>
          sql.public.agendamento
            .select('id')
            .where((f, fns) => fns.eq(f.sala, valorAntigo('Sala 3')))
            .limit(1),
        run: () =>
          sql.public.agendamento
            .update({ sala: 'Sala Amarela' })
            .where((f, fns) => fns.eq(f.sala, valorAntigo('Sala 3'))),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'agendamento',
        constraint: 'agendamento_sala_check_ea25e272',
        expression: "\"sala\" IN ('Sala Azul', 'Sala Verde', 'Sala Amarela')",
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
