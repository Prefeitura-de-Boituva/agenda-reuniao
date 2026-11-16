interface PersistedGradeState {
  selectedRoomId: string;
  weekStartIso: string;
}

// v2: só estado de navegação é persistido. A versão anterior guardava também as
// reservas criadas/editadas/canceladas no navegador, e esse cache local passava a
// vencer o dado fresco da API para o mesmo id — a Grade de Horários podia exibir
// uma programação diferente da tela inicial e do banco. Trocar a chave descarta o
// cache já gravado nos navegadores.
const STORAGE_KEY = "agenda-reuniao:grade:v2";

export function loadGradeState(): PersistedGradeState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as unknown;

    if (
      typeof data !== "object" ||
      data === null ||
      typeof (data as Record<string, unknown>).selectedRoomId !== "string" ||
      typeof (data as Record<string, unknown>).weekStartIso !== "string"
    ) {
      return null;
    }

    return data as PersistedGradeState;
  } catch {
    return null;
  }
}

export function saveGradeState(state: PersistedGradeState): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage indisponível ou cheio — ignora silenciosamente
  }
}