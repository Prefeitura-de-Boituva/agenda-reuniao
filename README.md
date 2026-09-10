# Agenda-Reuniao

Aplicação web para agendamento de salas de reunião, substituindo o controle
manual em papel. Permite consultar disponibilidade, criar agendamentos e
cancelar reservas informando o departamento.

## Stack

| Componente       | Tecnologia                  |
| ---------------- | --------------------------- |
| Frontend         | Next.js (App Router)        |
| Backend          | Next.js                     |
| Linguagem        | TypeScript                  |
| Estilização      | Tailwind CSS                |
| Banco de dados   | PostgreSQL (integração futura via Prisma) |

## Pré-requisitos

- Node.js 18.18 ou superior (recomendado: 20+)
- npm (vem com o Node.js)

## Como rodar localmente

```bash
# instalar dependências
npm install

# iniciar servidor de desenvolvimento
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## Scripts disponíveis

| Comando         | Descrição                          |
| --------------- | ---------------------------------- |
| `npm run dev`   | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera o build de produção           |
| `npm run start` | Inicia o build de produção         |
| `npm run lint`  | Executa o ESLint                   |

## Estrutura de pastas

```
├── src/
│   └── app/          # Rotas da aplicação (App Router)
│       ├── layout.tsx    # Layout raiz
│       ├── page.tsx      # Página inicial
│       └── globals.css   # Estilos globais (Tailwind)
├── public/           # Arquivos estáticos
├── docs/             # Documentação do projeto (local, não versionada)
├── next.config.ts    # Configuração do Next.js
├── tsconfig.json     # Configuração do TypeScript
└── package.json
```

## Próximos passos

- Modelagem de dados com Prisma + PostgreSQL
- Telas de agenda por sala, novo agendamento e cancelamento
- Regras de negócio (horários 08:00–17:00, blocos de 30 min, conflitos por sala)
