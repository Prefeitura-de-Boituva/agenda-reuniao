import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const ROTULO = "scrypt";
const PARAMETROS = { N: 16384, r: 8, p: 1 } as const;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

export const SENHA_MINIMA = 4;
export const SENHA_MAXIMA = 64;

/**
 * Normalização espelha `isMesmoDepartamento`: acento e caixa não devem travar o
 * dono da reserva ao digitar a própria senha num teclado de celular.
 */
export function normalizarSenha(senha: string): string {
  return senha
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Erro legível para a senha já normalizada, ou `null` quando aceita. */
export function erroDaSenha(senha: string): string | null {
  if (senha.length < SENHA_MINIMA) return `A senha deve ter ao menos ${SENHA_MINIMA} caracteres.`;
  if (senha.length > SENHA_MAXIMA) return `A senha deve ter no máximo ${SENHA_MAXIMA} caracteres.`;
  return null;
}

async function derivar(senha: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(senha, salt, HASH_BYTES, PARAMETROS, (erro, resultado) => {
      if (erro) reject(erro);
      else resolve(resultado);
    });
  });
}

/** Formato armazenado: `scrypt$N$r$p$<salt hex>$<hash hex>` — a senha nunca é gravada. */
export async function gerarHashSenha(senha: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const hash = await derivar(normalizarSenha(senha), salt);
  return [ROTULO, PARAMETROS.N, PARAMETROS.r, PARAMETROS.p, salt.toString("hex"), hash.toString("hex")].join("$");
}

export async function confereSenha(senha: string, armazenado: string | null): Promise<boolean> {
  if (!armazenado) return false;
  const partes = armazenado.split("$");
  if (partes.length !== 6 || partes[0] !== ROTULO) return false;
  const salt = Buffer.from(partes[4], "hex");
  const esperado = Buffer.from(partes[5], "hex");
  if (salt.length === 0 || esperado.length === 0) return false;

  const candidato = await derivar(normalizarSenha(senha), salt);
  // `timingSafeEqual` lança em tamanhos diferentes; o keylen é fixo, mas o hash
  // lido pode vir truncado de uma escrita manual no banco.
  return candidato.length === esperado.length && timingSafeEqual(candidato, esperado);
}
