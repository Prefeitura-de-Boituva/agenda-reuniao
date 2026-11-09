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
