# LatesOS

Sistema de gestão para clínicas de Pilates e Fisioterapia, com foco em operação diária, agenda, financeiro, relatórios e geração de orçamento em PDF.

## Visão Geral

O projeto é dividido em duas aplicações:

- `backend`: API REST em NestJS + TypeORM + PostgreSQL.
- `frontend`: SPA em Angular (standalone components).

## Principais Funcionalidades

- Autenticação JWT com refresh token.
- Gestão de clientes e profissionais (CRUD + busca).
- Agenda com validações de conflito, remarcação e cancelamento com motivo.
- Financeiro com lançamentos de entrada/saída e dashboard.
- Controle de cobranças recorrentes (mensal/trimestral/anual) com status de pagamento.
- Relatórios gerenciais (eficiência por profissional e auditoria de abertura).
- Módulo de serviços com geração de orçamento em PDF.

## Estrutura

```text
.
├── backend/
├── frontend/
├── docker-compose.yml
└── .gitignore
```

## Pré-requisitos

- Node.js 20+
- npm 10+
- PostgreSQL 14+
- (Opcional) Docker / Docker Compose

## Como Rodar (Local)

### 1) Banco e serviços de infraestrutura

Opção A (Docker):

```bash
docker compose up -d postgres rabbitmq kafka
```

Opção B (manual):

- Suba PostgreSQL local.
- Ajuste `backend/.env` com `DATABASE_URL`.

### 2) Backend

```bash
cd backend
npm install
npm run migration:run
npm run start:dev
```

API padrão: `http://localhost:3000`

### 3) Frontend

```bash
cd frontend
npm install
npm run start
```

App padrão: `http://localhost:4200`

## Login inicial

O seed usa credenciais vindas do `.env` do backend:

- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Exemplo comum no projeto:

- Email: `admin@pilatesos.com`
- Senha: `admin123`

## Branding (logo e favicon)

Arquivo de logo padrão:

- `frontend/public/assets/logo.png`

Esse arquivo é utilizado em:

- Favicon
- Tela de login
- Painel lateral

## Scripts úteis

### Backend

- `npm run start:dev`
- `npm run build`
- `npm run migration:run`
- `npm run test`

### Frontend

- `npm run start`
- `npm run build`
- `npm run test`

## Convenção de commits (Conventional Commits)

Padrão recomendado:

- `feat(scope): descrição`
- `fix(scope): descrição`
- `docs(scope): descrição`
- `refactor(scope): descrição`
- `test(scope): descrição`
- `chore(scope): descrição`

Exemplos:

- `feat(finance): add recurring subscription billing endpoints`
- `fix(services): generate valid quote pdf stream`
- `docs(readme): document setup for backend and frontend`

## Documentação por app

- [Backend README](./backend/README.md)
- [Frontend README](./frontend/README.md)
