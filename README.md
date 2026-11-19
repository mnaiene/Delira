# Kawash — Sistema de Gerenciamento de Lava-Rápido

Sistema web para gerenciar um lava-rápido (carwash): registrar atendimentos
(carros lavados), controlar despesas e acompanhar a receita diária, semanal e
mensal em um dashboard.

## Stack

- **Backend:** Node.js + Express + SQLite via [@libsql/client](https://github.com/tursodatabase/libsql-client-ts)
  — localmente usa um arquivo `.db` comum; em produção aponta para um banco
  [Turso](https://turso.tech) (SQLite hospedado, acessível pela rede — necessário
  para rodar em serverless como o Vercel).
- **Autenticação:** login com e-mail/senha, sessão via cookie JWT (httpOnly)
- **Frontend:** HTML/CSS/JS puro (sem build), SPA servida pelo próprio backend

Sem `TURSO_DATABASE_URL` definida, os dados ficam no arquivo local
`data/carwash.db` (bom para rodar na sua máquina). Com `TURSO_DATABASE_URL` +
`TURSO_AUTH_TOKEN` definidas, os dados vão para o seu banco Turso (necessário
em produção/Vercel).

## Como rodar localmente

```bash
npm install
npm start
```

O servidor sobe em `http://localhost:3000` (ou na porta definida em `PORT`).

Na primeira execução é criado automaticamente um usuário administrador:

- **E-mail:** `admin@kawash.com`
- **Senha:** `admin123`

> Troque a senha depois de entrar, em "Trocar senha" no menu lateral.
>
> Para customizar o usuário inicial, defina as variáveis de ambiente
> `ADMIN_EMAIL` e `ADMIN_PASSWORD` antes de rodar o servidor pela primeira vez
> (elas só têm efeito quando o banco ainda não tem nenhum usuário). Defina
> também `JWT_SECRET` em produção (um valor aleatório e secreto). Veja
> `.env.example` para a lista completa de variáveis.

## Publicar no Vercel (passo a passo)

O Vercel não tem disco permanente, então o app precisa de um banco acessível
pela rede. Usamos o **Turso** (SQLite hospedado, com plano gratuito) — é o que
exige menos mudança de código.

### 1. Criar o banco no Turso

1. Crie uma conta grátis em [turso.tech](https://turso.tech).
2. Instale a CLI do Turso e rode (ou use o painel web deles):
   ```bash
   turso db create kawash
   turso db show kawash --url
   turso db tokens create kawash
   ```
3. Guarde a **URL** (algo como `libsql://kawash-xxxx.turso.io`) e o **token**
   gerados — vão virar variáveis de ambiente no Vercel.

### 2. Importar o projeto no Vercel

1. Entre em [vercel.com](https://vercel.com) com sua conta (conecte seu GitHub
   se ainda não tiver feito isso).
2. Clique em **Add New → Project** e selecione o repositório `mnaiene/Delira`
   (branch `claude/carwash-management-system-w1ztgi`, ou a branch que você
   escolher depois do merge).
3. O Vercel detecta o projeto Node automaticamente (não precisa mudar build
   command nem output directory — o `vercel.json` já cuida disso).
4. Em **Environment Variables**, adicione:

   | Nome | Valor |
   |---|---|
   | `TURSO_DATABASE_URL` | a URL do passo 1 |
   | `TURSO_AUTH_TOKEN` | o token do passo 1 |
   | `JWT_SECRET` | qualquer string longa e aleatória (ex: gere uma em https://1password.com/password-generator ou rode `openssl rand -hex 32`) |
   | `ADMIN_EMAIL` *(opcional)* | e-mail do primeiro admin |
   | `ADMIN_PASSWORD` *(opcional)* | senha do primeiro admin |

5. Clique em **Deploy**. Em ~1 minuto o Kawash estará no ar, com schema e
   usuário admin criados automaticamente no primeiro acesso.

> Qualquer novo `git push` nessa branch publica automaticamente uma nova
> versão (o Vercel já fica "ligado" ao repositório).

## Perfis de usuário

- **Administrador:** acesso total — Dashboard completo (receita/gastos/lucro
  por funcionário), Atendimentos (de todos), Despesas, Serviços e gestão de
  Usuários (criar/editar/desativar funcionários).
- **Funcionário:** só vê Dashboard simplificado (receita gerada e carros
  atendidos por ele mesmo) e a tela de Atendimentos, onde só pode registrar e
  editar/excluir os atendimentos que ele próprio criou. Não acessa Despesas,
  Serviços nem Usuários.

O administrador cria contas de funcionário em **Usuários**. Cada atendimento
guarda quem o registrou, e isso aparece para o administrador na lista de
Atendimentos (coluna "Atendido por") e no Dashboard (painel "Atendimentos por
funcionário").

Valores são exibidos em **Metical (MT)**. Formas de pagamento disponíveis:
Dinheiro, M-Pesa e e-Mola.

## Funcionalidades

- **Dashboard:** receita, gastos, lucro e carros atendidos de hoje, da semana
  e do mês; gráfico dos últimos 7 dias; formas de pagamento; gastos por
  categoria; serviços mais pedidos; atendimentos por funcionário; últimos
  atendimentos (admin). Versão simplificada para funcionários.
- **Atendimentos:** registrar cada carro atendido (serviço, preço, cliente,
  placa, veículo, forma de pagamento, status), com filtro por período/status.
- **Despesas** (admin): registrar gastos (produtos, salários, água/luz,
  manutenção, aluguel, outros), com filtro por período/categoria.
- **Serviços** (admin): catálogo de serviços com preço padrão, usado para
  preencher o valor automaticamente ao registrar um atendimento.
- **Usuários** (admin): criar contas de funcionário, trocar senha deles,
  ativar/desativar acesso.

## Estrutura do projeto

```
api/
  index.js             Entry point do Vercel (reexporta server/app.js)
vercel.json            Manda todas as rotas para api/index.js
server/
  app.js               App Express configurado (rotas + estáticos), sem listen
  index.js             Sobe o servidor localmente (usa server/app.js)
  db.js                Cliente @libsql/client (local ou Turso), schema e seed
  asyncRoute.js         Helper para capturar erros em rotas async
  auth.js              JWT / cookie de sessão, requireAdmin
  routes/
    auth.js            Login, logout, trocar senha
    users.js           CRUD de usuários (admin)
    services.js        CRUD de serviços (admin)
    atendimentos.js    CRUD de atendimentos, com escopo por perfil
    despesas.js        CRUD de despesas (admin)
    dashboard.js       Resumo agregado (receita/gastos/lucro/carros)
public/
  index.html          SPA (login + app)
  css/styles.css
  js/                 api.js, constants.js, charts.js, app.js, views/*.js
data/                 Banco SQLite local (criado em runtime, fora do git,
                      só usado quando TURSO_DATABASE_URL não está definida)
```

## Observações para produção

- Rodando localmente sem variáveis do Turso, os dados ficam em
  `data/carwash.db` — bom para testar, mas esse arquivo não persiste em
  containers efêmeros (como este ambiente de desenvolvimento) nem no Vercel.
- Em produção (Vercel ou qualquer outro host), defina `TURSO_DATABASE_URL` e
  `TURSO_AUTH_TOKEN` para os dados ficarem no banco Turso, que persiste e
  aceita acessos simultâneos de múltiplos funcionários/dispositivos.
- Também dá para rodar este mesmo servidor Node (sem Vercel) numa VPS, Render,
  Railway etc. com disco persistente — nesse caso o SQLite local já funciona
  sem precisar do Turso.
