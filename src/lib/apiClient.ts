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

export async function criarAgendamento(payload: {
  nome: string;
  departamento: string;
  sala: string;
  data: string; // YYYY-MM-DD
  horaInicio: string; // HH:mm
  horaFim: string; // HH:mm
}) {
  const response = await fetch('/api/agendamentos', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    // status not 2xx → lê o JSON de erro e lança ApiError com status+mensagem
    await lerErro(response, "Erro ao criar agendamento");
  }

  // sucesso → devolve o objeto criado
  return response.json();
}

export async function cancelarAgendamento(id: string, departamento: string) {
  const response = await fetch(`/api/agendamentos/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ departamento }),
  });

  if (!response.ok) {
    await lerErro(response, "Erro ao cancelar agendamento");
  }

  return response.json();
}
