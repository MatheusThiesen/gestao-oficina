# Gestão Oficina

Sistema desktop (Windows) para oficinas mecânicas: orçamentos, ordens de serviço, clientes, veículos,
peças e chaveiros numerados. Um computador no balcão, banco local.

Cada oficina configura na primeira abertura o **nome do programa, a logo, as cores e a senha** (opcional).
Isso vale para o menu, o ícone, os atalhos do Windows e o PDF do orçamento.

## O que tem

- **Painel**: o dia (carros na oficina, prontos, aguardando aprovação) e a análise da semana/mês com
  faturamento × lucro bruto.
- **Orçamentos e OS**: busca por placa, cliente, número ou chave; editor com peças e mão de obra,
  markup, desconto e bloco interno de custo/lucro; PDF para o cliente.
- **Clientes e veículos**: CPF/CNPJ e placa validados, histórico do carro, garantias, próxima troca de óleo,
  troca de dono sem perder o histórico.
- **Configurações**: identidade, empresa, padrões do orçamento, senha e atualizações.
- **Atualização automática** pelas Releases deste repositório (veja `PUBLICAR.md`).

## Stack

Electron + electron-vite, React, TypeScript, Tailwind, SQLite com Prisma 7 (`@prisma/adapter-better-sqlite3`),
Vitest, electron-builder (NSIS) e electron-updater.

```
src/main/       processo principal: domain (regras puras), application (casos de uso), infra (banco, PDF…), ipc
src/preload/    API tipada exposta à tela (contextIsolation + sandbox)
src/renderer/   React
src/shared/     contratos IPC e tipos
```

Dinheiro em centavos, percentuais em centésimos (4000 = 40%), quantidades em milésimos — tudo inteiro.

## Desenvolvimento

```bash
npm install        # gera o Prisma Client e compila o SQLite para o Electron
npm run dev        # abre o app (com dados de exemplo no primeiro uso)
npm test           # testes do domínio
npm run typecheck && npm run lint
npm run db:migrate -- --name descricao   # nova migration
```

Com npm 11, os scripts de instalação permitidos estão em `allowScripts` no `package.json`.
