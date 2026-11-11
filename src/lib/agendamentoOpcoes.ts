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

/**
 * Os guards abaixo são *type predicates*: além de validarem em runtime, eles
 * estreitam `string` para a união literal do enum. É o que permite passar os
 * valores do corpo da requisição para o cliente tipado do Prisma 8.
 */
export function isSalaValida(valor: string): valor is Sala {
  return (SALAS as readonly string[]).includes(valor);
}

export function isDepartamentoValido(valor: string): valor is Departamento {
  return (DEPARTAMENTOS as readonly string[]).includes(valor);
}
