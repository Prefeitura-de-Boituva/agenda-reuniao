export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function lerErro(response: Response, fallback: string): Promise<never> {
  let message = fallback;
  try {
    const data = await response.json();
    if (typeof data?.error === "string") message = data.error;
  } catch {
    // corpo não-JSON → usa a mensagem padrão
  }
  throw new ApiError(response.status, message);
}

/**
 * `senha` é a credencial das reservas criadas com senha. `departamento` continua
 * indo porque as reservas anteriores a essa mudança não têm hash — a rota usa um
 * ou outro conforme o registro. Quando as reservas antigas tiverem passado, dá
 * para mandar só a senha.
 */
export interface CredenciaisCancelamento {
  senha?: string;
  departamento?: string;
}

export async function cancelarAgendamento(id: string, credenciais: CredenciaisCancelamento) {
  const response = await fetch(`/api/agendamentos/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(credenciais),
  });

  if (!response.ok) {
    await lerErro(response, "Erro ao cancelar agendamento");
  }

  return response.json();
}

export interface DadosEdicao {
  nome: string;
  departamento: string;
  horaInicio: string;
  horaFim: string;
}

/** Sala e data não são editáveis: a API mantém os valores gravados. */
export async function editarAgendamento(id: string, dados: DadosEdicao) {
  const response = await fetch(`/api/agendamentos/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(dados),
  });

  if (!response.ok) {
    await lerErro(response, "Erro ao editar agendamento");
  }

  return response.json();
}
