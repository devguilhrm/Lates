# Roadmap App do Cliente (Mobile + Desktop)

## Stack recomendada

- Frontend: Angular 21 + PWA
- Mobile nativo (quando entrar em loja): Capacitor sobre o mesmo app Angular
- Backend: NestJS (atual)
- Banco: PostgreSQL (atual)

## Objetivo

Entrega de experiencia focada no cliente para:

1. visualizar situacao de mensalidade e creditos;
2. escolher profissional e horario;
3. criar e cancelar agendamento com validacao de regras de negocio.

## Fases

### Fase 1 - Regra de negocio e seguranca (concluida)

1. Bloqueio de agendamento sem credito.
2. Bloqueio especifico de mensalidade em aberto com credito esgotado.
3. Debito de credito no ato do agendamento.
4. Estorno de credito em cancelamentos que nao sao no-show.
5. Restricao para cliente agendar e consultar apenas os proprios dados.

### Fase 2 - Experiencia do cliente (concluida no MVP web responsivo)

1. Tela `my-schedule` com:
   - dados do cliente (plano, creditos, mensalidade),
   - busca de slots por profissional/data/duracao,
   - botao de confirmar agendamento,
   - listagem de proximos agendamentos e cancelamento.
2. Redirecionamento de login para area de cliente quando `role=CLIENT`.

### Fase 3 - Evolucao mobile

1. Ativar PWA completo (instalavel offline-first).
2. Empacotar com Capacitor para Android/iOS.
3. Push notifications para lembretes de sessao.

### Fase 4 - Qualidade e monitoramento

1. Cobrir regras criticas com testes E2E.
2. Monitorar erros de agendamento por motivo (sem credito, mensalidade etc.).
3. Criar funil de conversao para identificar abandono antes da confirmacao.

## Backlog sugerido (proximos passos)

1. Tela de historico de pagamentos do cliente.
2. Renovacao/compra de creditos dentro do app.
3. Reagendamento self-service para cliente.
4. Alertas proativos de vencimento antes do bloqueio.
