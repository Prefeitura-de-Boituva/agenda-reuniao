/**
 * Seed de dados de teste para o banco (Neon).
 *
 * O Prisma 8 não possui `prisma db seed` de primeira classe, por isso este
 * script é executado diretamente pelo Node:
 *
 *   npm run seed
 *
 * Observação: este script cria sua própria conexão com o runtime do Prisma 8
 * para falar com o Postgres/Neon de verdade. A aplicação usa a mesma conexão
 * através de `src/prisma/db.ts`, mas aqui o pool é fechado ao final. O seed é
 * idempotente e pode ser executado várias vezes.
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import postgres from '@prisma/orm-postgres/runtime';
import type { Varchar } from '@prisma/orm-postgres/target/codec-types';
import type { Contract, Models } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

type Sala = Models.public_Agendamento['sala'];
type Departamento = Models.public_Agendamento['departamento'];
type Hora = Varchar<5>;

/** O contrato tipa `horaInicio`/`horaFim` como `varchar(5)` (tipo "branded"). */
const hora = (valor: string): Hora => valor as Hora;

interface AgendamentoSeed {
  nome: string;
  departamento: Departamento;
  sala: Sala;
  data: string; // YYYY-MM-DD
  horaInicio: Hora; // HH:MM
  horaFim: Hora; // HH:MM
}

const url = process.env['DATABASE_URL'];
if (!url) {
  console.error(
    '✖ DATABASE_URL não está definida. Crie um .env com a connection string do banco antes de rodar o seed.'
  );
  process.exit(1);
}

const db = postgres<Contract>({ contractJson, url });

/** Retorna a data local (sem fuso) de hoje + N dias, no formato YYYY-MM-DD. */
function dataDaquiA(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

const AGENDAMENTOS: AgendamentoSeed[] = [
  {
    nome: 'Reunião de alinhamento semanal',
    departamento: 'Chefia de Gabinete',
    sala: 'Sala Azul',
    data: dataDaquiA(1),
    horaInicio: hora('09:00'),
    horaFim: hora('10:00'),
  },
  {
    nome: 'Planejamento orçamentário',
    departamento:
      'Secretaria Municipal Fazenda, Desenvolvimento Econômico e Finanças',
    sala: 'Sala Azul',
    data: dataDaquiA(1),
    horaInicio: hora('14:00'),
    horaFim: hora('15:00'),
  },
  {
    nome: 'Vistoria de obras',
    departamento: 'Secretaria Municipal Obras Públicas',
    sala: 'Sala Verde',
    data: dataDaquiA(2),
    horaInicio: hora('10:00'),
    horaFim: hora('11:00'),
  },
  {
    nome: 'Parecer jurídico',
    departamento: 'Secretaria Municipal de Assuntos Jurídicos',
    sala: 'Sala Amarela',
    data: dataDaquiA(3),
    horaInicio: hora('08:30'),
    horaFim: hora('09:30'),
  },
  {
    nome: 'Comitê de eventos',
    departamento: 'Secretaria Municipal Turismo, Juventude e Empreendedorismo',
    sala: 'Sala Verde',
    data: dataDaquiA(4),
    horaInicio: hora('15:00'),
    horaFim: hora('16:30'),
  },
];

async function main(): Promise<void> {
  console.log('→ Semeando agendamentos de teste...');

  // Idempotência: remove agendamentos com a mesma chave única
  // (sala, data, horaInicio) antes de inserir, para o seed poder ser
  // executado várias vezes sem violar o unique constraint.
  for (const a of AGENDAMENTOS) {
    await db.orm.public.Agendamento.where({
      sala: a.sala,
      data: a.data,
      horaInicio: a.horaInicio,
    }).delete();
  }

  const criados: Models.public_Agendamento[] = [];
  for (const a of AGENDAMENTOS) {
    const criado = await db.orm.public.Agendamento.create({
      id: randomUUID(),
      criadoEm: new Date().toISOString(),
      ...a,
    });
    criados.push(criado);
  }

  console.log(`✔ ${criados.length} agendamentos inseridos:`);
  for (const a of criados) {
    console.log(
      `   • ${a.data} ${a.horaInicio}–${a.horaFim} | ${a.sala} | ${a.nome} (${a.departamento})`
    );
  }
}

main()
  .catch((erro) => {
    console.error('✖ Falha ao semear o banco:', erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.close();
  });
