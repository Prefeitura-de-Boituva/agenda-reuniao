# Registro de feedback e bugs — validação com usuários reais

Companion do [roteiro de teste](testes-usuarios-reais.md) da issue
[#29](https://github.com/Prefeitura-de-Boituva/agenda-reuniao/issues/29).
Preencher durante ou imediatamente após cada sessão de teste.

## Participantes

| # | Nome | Secretaria/departamento | Data do teste | Hora de início | Cenários executados |
|---|---|---|---|---|---|
| 1 | | | | | C1 C2 C3 C4 C5 C6 |
| 2 | | | | | C1 C2 C3 C4 C5 C6 |
| 3 | | | | | C1 C2 C3 C4 C5 C6 |

> Critério de aceite: mínimo 3 colaboradores. Registrar todos os que testaram.

## Como classificar a severidade

| Severidade | Definição |
|---|---|
| **Crítico** | Impede de reservar ou cancelar; dado some ou aparece errado; mensagem técnica/stack trace na tela |
| **Alto** | Fluxo possível, mas com risco de erro real (mensagem enganosa, conflito não mostrado, reserva duplicada) |
| **Médio** | Atravessa o uso sem bloquear (campo difícil de achar, texto confuso, tela lenta) |
| **Baixo** | Detalhe visual, ortografia, sugestão de melhoria |

## Bugs encontrados

Repetir o bloco abaixo para cada bug. Não corrigir nada durante o teste — apenas registrar.

```
ID:            B01
Data/hora:     ____/____/______ às __:__
Encontrado por:
Cenário:       C1 / C2 / C3 / C4 / C5 / C6 / outro (descrever)
Sala:          Azul / Verde / Amarela
Data da reunião testada:
Horários:      início __:__  fim __:__
Nome/departamento usados:
Passos até o erro:
  1.
  2.
  3.
O que deveria acontecer:
O que aconteceu:
Severidade:    Crítico / Alto / Médio / Baixo
Print anexo:   (sim/nome do arquivo)
```

| ID | Cenário | Resumo | Severidade | Issue aberta | Status |
|---|---|---|---|---|---|
| B01 | | | | ☐ | ☐ |

## Sugestões e feedback qualitativo

Transcrever as respostas da "Coleta geral" de cada participante, sem interpretar.

| ID | Participante | Cenário/pergunta | Relato textual | Classificação (bug/melhoria/dúvida) |
|---|---|---|---|---|
| F01 | | | | |

## Conversão em issues

Cada bug de severidade **Crítico** ou **Alto** vira uma issue própria, vinculada à #29.
Copie o bloco do bug para um arquivo e crie a issue a partir dele (assim as quebras de
linha são preservadas):

```bash
gh issue create --repo Prefeitura-de-Boituva/agenda-reuniao \
  --title "Resumo curto do comportamento errado" \
  --body-file B01.md \
  --label bug
```

Preencher a coluna "Issue aberta" da tabela acima com o número criado.

## Consolidação (preencher ao final)

- Total de colaboradores que testaram:
- Total de bugs: críticos __ / altos __ / médios __ / baixos __
- Total de sugestões:
- Bugs corrigidos antes do encerramento da #29:
- Bugs adiados (e por quê):
- Painel/avaliação final (o que os usuários mais pediram, em uma frase):
