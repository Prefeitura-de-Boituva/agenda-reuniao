/**
 * Opções de sala e departamento compartilhadas entre o formulário e a API.
 *
 * Os valores espelham os enums `Sala` e `Departamento` do contrato Prisma
 * (`src/prisma/contract.prisma`). Mantê-los em um único lugar evita que o front
 * envie um valor que o banco (enum/CHECK) rejeitaria — o que, contra o Postgres
 * real, retornaria 500 em vez do 400 tratado pela rota.
 */

export const SALAS = ["Sala Azul", "Sala Verde", "Sala Amarela"] as const;

export const DEPARTAMENTOS = [
  "Chefia de Gabinete",
  "Secretaria Municipal Governo e Planejamento Estratégico",
  "Secretaria Municipal de Assuntos Jurídicos",
  "Secretaria Municipal Administração, Gestão e Equipe Públicos",
  "Secretaria Municipal Fazenda, Desenvolvimento Econômico e Finanças",
  "Secretaria Municipal Turismo, Juventude e Empreendedorismo",
  "Secretaria Municipal Obras Públicas",
  "Secretaria Municipal Planejamento Urbano e Habitação",
] as const;

export type Sala = (typeof SALAS)[number];
export type Departamento = (typeof DEPARTAMENTOS)[number];

export function isSalaValida(valor: string): boolean {
  return (SALAS as readonly string[]).includes(valor);
}

export function isDepartamentoValido(valor: string): boolean {
  return (DEPARTAMENTOS as readonly string[]).includes(valor);
}
