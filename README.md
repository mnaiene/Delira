# Delira — Sistema de Gerenciamento de Lava-Rápido

Sistema web para gerenciar um lava-rápido (carwash): registrar atendimentos
(carros lavados), controlar despesas e acompanhar a receita diária, semanal e
mensal em um dashboard.

## Stack

- **Backend:** Node.js + Express + SQLite ([better-sqlite3](https://github.com/WiseLibs/better-sqlite3))
- **Autenticação:** login com e-mail/senha, sessão via cookie JWT (httpOnly)
- **Frontend:** HTML/CSS/JS puro (sem build), SPA servida pelo próprio backend

Todos os dados (atendimentos, despesas, serviços, usuários) ficam no arquivo
`data/carwash.db`, criado automaticamente na primeira execução.

## Como rodar

```bash
npm install
npm start
```

O servidor sobe em `http://localhost:3000` (ou na porta definida em `PORT`).

Na primeira execução é criado automaticamente um usuário administrador:

- **E-mail:** `admin@delira.com`
- **Senha:** `admin123`

> Troque a senha depois de entrar, em "Trocar senha" no menu lateral.
>
> Para customizar o usuário inicial, defina as variáveis de ambiente
> `ADMIN_EMAIL` e `ADMIN_PASSWORD` antes de rodar o servidor pela primeira vez
> (elas só têm efeito quando o banco ainda não tem nenhum usuário). Defina
> também `JWT_SECRET` em produção (um valor aleatório e secreto).

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
server/
  index.js           Servidor Express (API + arquivos estáticos)
  db.js              Conexão SQLite, schema e seed inicial
  auth.js            JWT / cookie de sessão, requireAdmin
  routes/
    auth.js          Login, logout, trocar senha
    users.js          CRUD de usuários (admin)
    services.js       CRUD de serviços (admin)
    atendimentos.js   CRUD de atendimentos, com escopo por perfil
    despesas.js        CRUD de despesas (admin)
    dashboard.js       Resumo agregado (receita/gastos/lucro/carros)
public/
  index.html          SPA (login + app)
  css/styles.css
  js/                 api.js, constants.js, charts.js, app.js, views/*.js
data/                  Banco SQLite (criado em runtime, fora do git)
```

## Observações para produção

- Este container de desenvolvimento é efêmero: o arquivo `data/carwash.db`
  **não** é persistido entre sessões/deploys a menos que o app rode em um
  servidor/host próprio com disco persistente.
- Para múltiplos funcionários acessando ao mesmo tempo de dispositivos
  diferentes, basta hospedar este mesmo servidor Node em uma VPS, Render,
  Railway, etc. — o SQLite já suporta múltiplas conexões simultâneas de
  leitura/escrita para o volume de uso de um lava-rápido.
