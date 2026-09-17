import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/agendamentos/route';

// Mock Prisma DB used by temConflito
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

import { db } from '@/prisma/db';

describe('POST /api/agendamentos conflict handling', () => {
  const mockWhere = db.orm.public.Agendamento.where as any;

  beforeEach(() => {
    mockWhere.mockReset();
  });

  it('returns 409 Conflict when the requested slot overlaps an existing booking', async () => {
    // Existing booking in the same room and date that overlaps 10:30‑11:30
    mockWhere.mockResolvedValue([
      { horaInicio: '10:00', horaFim: '11:00' }
    ]);

    const request = new Request('http://localhost/api/agendamentos', {
      method: 'POST',
      body: JSON.stringify({
        nome: 'Teste',
        departamento: 'Secretaria Municipal Fazenda, Desenvolvimento Econômico e Finanças',
        sala: 'Sala Azul',
        data: '2026-09-20',
        horaInicio: '10:30',
        horaFim: '11:30'
      })
    });

    const response = await POST(request);
    const json = await response.json();

    expect(response.status).toBe(409);
    expect(json).toEqual({ error: 'Horário conflita com agendamento existente' });
  });
});
