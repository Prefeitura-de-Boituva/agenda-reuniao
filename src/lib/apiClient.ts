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
    // status not 2xx → lê o JSON de erro
    const data = await response.json();
    // lança com a mensagem devolvida pelo servidor
    throw new Error(data.error ?? 'Erro ao criar agendamento');
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
    const data = await response.json();
    throw new Error(data.error ?? "Erro ao cancelar agendamento");
  }

  return response.json();
}
