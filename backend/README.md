# LatesOS Backend

API principal do LatesOS construída com NestJS.

## Stack

- NestJS 11
- TypeORM 0.3
- PostgreSQL
- JWT (access + refresh)
- Class Validator / Class Transformer
- Swagger

## Módulos

- `auth`: login, refresh, logout e guards de permissão.
- `clients`: cadastro e gestão de clientes.
- `professionals`: cadastro, especialidades e disponibilidade.
- `schedulings`: agenda, conflitos, conclusão, cancelamento e remarcação.
- `finance`: lançamentos, dashboard e mensalidades recorrentes.
- `services`: catálogo e orçamento em PDF.
- `seeds`: seed de admin e dados fictícios.
- `health`: status da aplicação.

## Estrutura resumida

```text
src/
├── common/
├── database/
│   ├── entities/
│   ├── migrations/
│   └── data-source.ts
├── modules/
│   ├── auth/
│   ├── clients/
│   ├── professionals/
│   ├── schedulings/
│   ├── finance/
│   ├── services/
│   ├── seeds/
│   └── health/
├── app.module.ts
└── main.ts
```

## Configuração

Crie/ajuste `backend/.env`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://postgres:senha@localhost:5432/pilates_db
DB_SYNC=false

ADMIN_NAME=Administrador
ADMIN_EMAIL=admin@pilatesos.com
ADMIN_PASSWORD=admin123

JWT_SECRET=troque-em-producao
JWT_EXPIRATION=15m
JWT_REFRESH_SECRET=troque-refresh-em-producao
JWT_REFRESH_EXPIRATION=7d

FRONTEND_URL=http://localhost:4200
QUEUES_ENABLED=false
RABBITMQ_URL=amqp://user:pass@localhost:5672
KAFKA_BROKERS=localhost:9094
KAFKA_CLIENT_ID=latesos-api
KAFKA_NOTIFICATIONS_GROUP_ID=latesos-notifications
```

## Executando

```bash
npm install
npm run migration:run
npm run start:dev
```

API: `http://localhost:3000`
Swagger: `http://localhost:3000/api`

## Scripts

- `npm run start:dev` inicia em modo watch.
- `npm run build` gera `dist/`.
- `npm run migration:run` aplica migrations.
- `npm run migration:revert` reverte última migration.
- `npm run test` executa testes.

## Endpoints principais

- `POST /auth/login`
- `POST /auth/refresh`
- `GET /clients`
- `POST /clients`
- `GET /professionals`
- `POST /professionals`
- `GET /schedulings`
- `POST /schedulings`
- `PATCH /schedulings/:id/cancel`
- `GET /finance/dashboard`
- `GET /finance/subscriptions`
- `POST /finance/subscriptions/:clientId/pay`
- `GET /services/catalog`
- `POST /services/quotes`
- `GET /services/quotes/:id/pdf`

## Regras importantes

- Agenda não permite horário passado.
- Cancelamento de agendamento exige tipo (`CLIENT_CANCELLED`, `PROFESSIONAL_CANCELLED`, `NO_SHOW`).
- Mensalidades recorrentes geram status (`PENDING`, `OVERDUE`, `PAID`) e baixam automaticamente no pagamento.

## Produção (recomendado)

- Use `DB_SYNC=false`.
- Não exponha secrets no repositório.
- Aplique migrations no deploy.
- Habilite HTTPS e rate limit em endpoints de autenticação.
