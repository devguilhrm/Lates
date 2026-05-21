# LatesOS Frontend

Interface web do LatesOS construída com Angular.

## Stack

- Angular 21 (standalone)
- TypeScript
- SCSS
- RxJS

## Módulos de tela

- `login`
- `dashboard`
- `clients`
- `professionals`
- `scheduling`
- `reports`
- `finance`
- `services`

## Estrutura resumida

```text
src/
├── app/
│   ├── core/
│   │   ├── auth/
│   │   ├── http/
│   │   ├── models/
│   │   └── theme/
│   ├── features/
│   │   ├── auth/
│   │   ├── clients/
│   │   ├── professionals/
│   │   ├── scheduling/
│   │   ├── reports/
│   │   ├── finance/
│   │   └── services/
│   ├── shared/
│   ├── app.routes.ts
│   └── app.ts
├── styles.scss
└── index.html
```

## Executando

```bash
npm install
npm run start
```

Aplicação em: `http://localhost:4200`

## Build de produção

```bash
npm run build
```

Saída: `dist/frontend`

## Integração com API

- URL base atual: `http://localhost:3000` (definida em `src/app/core/http/api.service.ts`).
- Requisições autenticadas usam interceptor JWT.

## Login

Credenciais padrão dependem do seed do backend (`ADMIN_EMAIL` e `ADMIN_PASSWORD`).

Exemplo comum:

- `admin@pilatesos.com`
- `admin123`

## Branding

Arquivo padrão de marca:

- `public/assets/logo.png`

Utilizado em:

- Favicon
- Tela de login
- Sidebar principal

## Scripts

- `npm run start` inicia servidor de desenvolvimento.
- `npm run build` gera build de produção.
- `npm run test` roda testes.
- `npm run test:ci` roda testes em modo CI (sem watch).

## Boas práticas no projeto

- Preferir componentes standalone.
- Manter tipagem via `core/models/domain.models.ts`.
- Centralizar chamadas REST em `core/http/api.service.ts`.
- Evitar lógica de negócio pesada nos templates.
