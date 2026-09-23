import 'dotenv/config';
import { db } from './db.ts';

const agendamentos = [
  {
    nome: 'Reunião de alinhamento semanal',
    departamento: 'Chefia de Gabinete',
    sala: 'Sala 1',
    data: '2026-09-24',
    horaInicio: '09:00',
    horaFim: '10:00',
  },
  {
    nome: 'Apresentação orçamentária',
    departamento: 'Secretaria Municipal Fazenda, Desenvolvimento Econômico e Finanças',
    sala: 'Sala 2',
    data: '2026-09-24',
    horaInicio: '14:00',
    horaFim: '15:30',
  },
  {
    nome: 'Planejamento de obras públicas',
    departamento: 'Secretaria Municipal Obras Públicas',
    sala: 'Sala 3',
    data: '2026-09-25',
    horaInicio: '10:00',
    horaFim: '11:00',
  },
  {
    nome: 'Campanha de turismo e juventude',
    departamento: 'Secretaria Municipal Turismo, Juventude e Empreendedorismo',
    sala: 'Sala 1',
    data: '2026-09-28',
    horaInicio: '15:00',
    horaFim: '16:00',
  },
  {
    nome: 'Revisão de contratos jurídicos',
    departamento: 'Secretaria Municipal de Assuntos Jurídicos',
    sala: 'Sala 2',
    data: '2026-09-29',
    horaInicio: '09:30',
    horaFim: '10:30',
  },
] as const;

async function main() {
  const existente = await db.orm.public.Agendamento.first();

  if (existente) {
    console.log('Banco já possui agendamentos — seed ignorado.');
    return;
  }

  for (const agendamento of agendamentos) {
    await db.orm.public.Agendamento.create(agendamento);
  }

  const criados = await db.orm.public.Agendamento.all();
  console.log(`Seed concluído: ${criados.length} agendamento(s) criado(s).`);
  for (const item of criados) {
    console.log(`- ${item.data} | ${item.sala} | ${item.horaInicio}-${item.horaFim} | ${item.nome}`);
  }
}

main()
  .catch((erro) => {
    console.error('Falha ao executar o seed:', erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.close();
  });