import { describe, expect, it, vi, beforeEach } from 'vitest';

// Mock Prisma DB
vi.mock('@/prisma/db', () => ({
  db: {
    orm: {
      public: {
        Agendamento: {
          where: vi.fn()
        }
      }
    }
  }
}));

import { temConflito } from '@/lib/conflict';
import { db } from '@/prisma/db';

type Agendamento = { horaInicio: string; horaFim: string };

describe('temConflito', () => {
  const mockWhere = db.orm.public.Agendamento.where as any;

  beforeEach(() => {
    mockWhere.mockReset();
  });

  it('detecta conflito total (mesmo intervalo)', async () => {
    mockWhere.mockResolvedValue([
      { horaInicio: '10:00', horaFim: '11:00' } as Agendamento,
    ]);
    const result = await temConflito('Sala Azul', '2026-09-20', '10:00', '11:00');
    expect(result).toBe(true);
  });

  it('detecta conflito parcial (início dentro de outro)', async () => {
    mockWhere.mockResolvedValue([
      { horaInicio: '10:00', horaFim: '11:00' } as Agendamento,
    ]);
    const result = await temConflito('Sala Azul', '2026-09-20', '10:30', '11:30');
    expect(result).toBe(true);
  });

  it('detecta conflito quando início coincide', async () => {
    mockWhere.mockResolvedValue([
      { horaInicio: '10:00', horaFim: '11:00' } as Agendamento,
    ]);
    const result = await temConflito('Sala Azul', '2026-09-20', '10:00', '10:30');
    expect(result).toBe(true);
  });

  it('detecta conflito quando fim coincide', async () => {
    mockWhere.mockResolvedValue([
      { horaInicio: '10:00', horaFim: '11:00' } as Agendamento,
    ]);
    const result = await temConflito('Sala Azul', '2026-09-20', '09:30', '11:00');
    expect(result).toBe(true);
  });

  it('não gera conflito em sala diferente', async () => {
    mockWhere.mockResolvedValue([
      { horaInicio: '10:00', horaFim: '11:00' } as Agendamento,
    ]);
    const result = await temConflito('Sala Verde', '2026-09-20', '10:30', '11:30');
    expect(result).toBe(false);
  });

  it('não gera conflito em data diferente', async () => {
    mockWhere.mockResolvedValue([
      { horaInicio: '10:00', horaFim: '11:00' } as Agendamento,
    ]);
    const result = await temConflito('Sala Azul', '2026-09-21', '10:30', '11:30');
    expect(result).toBe(false);
  });

  it('não gera conflito para reservas consecutivas (fim coincide com início)', async () => {
    mockWhere.mockResolvedValue([
      { horaInicio: '10:00', horaFim: '11:00' } as Agendamento,
    ]);
    const result = await temConflito('Sala Azul', '2026-09-20', '11:00', '12:00');
    expect(result).toBe(false);
  });
});
