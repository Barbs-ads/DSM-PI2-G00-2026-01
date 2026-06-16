<div align="center">

# Conectando Sonhos 🎁

**Uma plataforma que transforma cartinhas de crianças em presentes reais.**  
Instituições cadastram crianças, doadores adotam sonhos, voluntários entregam alegria.

[![GitHub Pages](https://img.shields.io/badge/Demo%20Online-GitHub%20Pages-blue?style=flat-square&logo=github)](https://barbs-ads.github.io/DSM-PI2-G00-2026-01/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![Supabase](https://img.shields.io/badge/Banco-Supabase-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![Versão](https://img.shields.io/badge/Vers%C3%A3o-1.1.0-orange?style=flat-square)](#)

</div>

---

## ✨ O que é o Conectando Sonhos?

Inspirado nas cartinhas ao Papai Noel, o **Conectando Sonhos** conecta crianças de instituições sociais a doadores dispostos a realizar um presente. A plataforma gerencia todo o fluxo: do cadastro da cartinha até a confirmação da entrega.

> 🎄 Cada cartinha representa uma criança real. Cada doação, um sonho realizado.

[Link do Youtube com a demonstração do projeto](https://youtu.be/_ErYe5zLqsI?si=AF_MXKn2p8o8B-jW)

---

## 🖥️ Páginas do Sistema

| Página | Descrição |
|---|---|
| `index.html` | Landing page com missão e chamada para ação |
| `cartas.html` | Mural de cartinhas + doe diretamente + envie uma cartinha |
| `sonhos.html` | Página de sonhos realizados |
| `impacto.html` | Painel de impacto com KPIs em tempo real |
| `sobre.html` | Sobre o projeto e a equipe |
| `cadastro.html` | Cadastro de doador ou instituição |
| `login.html` | Login geral |
| `doador.html` | Painel do doador — minhas adoções |
| `instituicao.html` | Painel da instituição — cadastrar cartinhas |
| `admin.html` | Painel administrativo completo |

---

## 👥 Perfis de Usuário

```
┌─────────────┬──────────────────────────────────────────────────────┐
│ Perfil      │ Permissões                                           │
├─────────────┼──────────────────────────────────────────────────────┤
│ Anônimo     │ Ver cartinhas, ver impacto, doe diretamente          │
│ Doador      │ Adotar cartinhas, ver minhas adoções                 │
│ Instituição │ Cadastrar crianças e cartinhas (após aprovação)      │
│ Admin       │ Aprovar instituições, moderar cartinhas, ver tudo    │
└─────────────┴──────────────────────────────────────────────────────┘
```

---

## 🗂️ Estrutura do Projeto

```
DSM-PI2-G00-2026-01/
├── frontend/                  # Interface web (HTML + CSS + JS puro)
│   ├── script/
│   │   ├── core.js            # Auth, apiGet/apiPost, toast, utilitários
│   │   ├── cartas.js          # Mural, doe diretamente, enviar cartinha
│   │   ├── auth.js            # Login e cadastro
│   │   ├── dashboard.js       # Painel doador e instituição
│   │   ├── admin.js           # Painel administrativo
│   │   ├── impacto.js         # KPIs e gráficos
│   │   └── index.js           # Landing page
│   ├── style/                 # CSS global e por página
│   └── *.html                 # Páginas da aplicação
│
├── backend/                   # API REST (Node.js + Express)
│   └── src/
│       ├── config/
│       │   └── supabase.js    # Clientes Supabase (anon, auth, admin)
│       ├── controllers/       # Lógica de negócio
│       ├── models/            # Acesso ao banco de dados
│       ├── middlewares/
│       │   └── auth.js        # Validação de JWT
│       └── routes/
│           └── index.js       # Todas as rotas da API
│
└── database/
    ├── migrations/            # Criação das tabelas e políticas RLS
    └── dados_iniciais_sistema.sql  # Seed com dados de exemplo
```

---

## 🗄️ Banco de Dados

```
usuarios          — doadores, responsáveis por instituições e admins
instituicoes      — ONGs e abrigos parceiros (precisam de aprovação)
criancas          — crianças vinculadas às instituições
cartinhas         — o pedido da criança (texto + categoria + status)
eventos_cartinha  — histórico de mudanças de status de cada cartinha
categorias_presente — tipos de presente (brinquedos, roupas, escola...)
pontos_coleta     — locais físicos de entrega das doações
doacoes_diretas   — doações sem cartinha específica (anônimas ou não)
```

**Status possíveis de uma cartinha:**

```
pendente → aprovada → adotada → entregue
                   ↘ cancelada
```

---

## 🚀 Como Rodar Localmente

### Pré-requisitos

- [Node.js](https://nodejs.org) v18+
- Conta no [Supabase](https://supabase.com) com o banco configurado

### 1. Clone o repositório

```bash
git clone https://github.com/barbs-ads/DSM-PI2-G00-2026-01.git
cd DSM-PI2-G00-2026-01
```

### 2. Configure o backend

```bash
cd backend
npm install
```

Crie o arquivo `.env` na pasta `backend/`:

```env
SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
JWT_SECRET=uma_string_secreta_qualquer
PORT=3000
```

### 3. Configure o banco de dados

No **SQL Editor do Supabase**, execute os arquivos em ordem:

```
1. database/migrations/001_tabelas.sql
2. database/migrations/002_rls.sql        (políticas de segurança)
3. database/dados_iniciais_sistema.sql    (dados de exemplo)
```

### 4. Inicie o backend

```bash
# Desenvolvimento (com hot-reload)
npm run dev

# Produção
npm start
```

A API ficará disponível em `http://localhost:3000`.

### 5. Abra o frontend

Abra qualquer `.html` da pasta `frontend/` diretamente no navegador, ou use uma extensão como **Live Server** no VS Code.

> **Atenção:** certifique-se de que a URL da API no `core.js` aponta para `http://localhost:3000`.

---

## 🔌 Endpoints da API

### Públicos (sem autenticação)

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/` | Health check da API |
| `POST` | `/auth/registrar/doador` | Cadastro de doador |
| `POST` | `/auth/registrar/instituicao` | Cadastro de instituição |
| `POST` | `/auth/login` | Login (todos os perfis) |
| `GET` | `/cartinhas` | Listar cartinhas aprovadas |
| `GET` | `/cartinhas/:id` | Detalhe de uma cartinha |
| `GET` | `/instituicoes` | Listar instituições aprovadas |
| `GET` | `/pontos` | Listar pontos de coleta |
| `POST` | `/presentes/avulso` | Registrar doação direta (anônima ou logada) |
| `GET` | `/impacto` | KPIs gerais da plataforma |
| `GET` | `/distribuicao` | Distribuição de doações por categoria |

### Autenticados — Doador

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/cartinhas/:id/adotar` | Adotar uma cartinha |
| `GET` | `/cartinhas/doador/minhas` | Minhas adoções |

### Autenticados — Instituição

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/cartinhas` | Cadastrar nova cartinha |

### Autenticados — Admin

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/admin/cartinhas` | Listar todas as cartinhas |
| `PATCH` | `/admin/cartinhas/:id/aprovar` | Aprovar cartinha |
| `PATCH` | `/admin/cartinhas/:id/entregar` | Marcar como entregue |
| `PATCH` | `/admin/cartinhas/:id/cancelar` | Cancelar cartinha |
| `GET` | `/admin/instituicoes` | Listar todas as instituições |
| `PATCH` | `/admin/instituicoes/:id/aprovar` | Aprovar instituição |
| `GET` | `/admin/doadores` | Listar doadores |
| `GET` | `/admin/presentes/avulsos` | Listar doações diretas |

---

## 🛠️ Tecnologias

**Frontend**
- HTML5, CSS3, JavaScript puro (sem frameworks)
- Bootstrap Icons

**Backend**
- Node.js + Express 5
- Supabase JS Client v2
- JWT (jsonwebtoken) + Helmet + Morgan

**Banco de Dados**
- PostgreSQL via Supabase
- Row Level Security (RLS) nativo
- Views materializadas para KPIs

---

## 👨‍💻 Equipe — Grupo QuadCore

Projeto desenvolvido pelos integrantes: Barbara Alves, Fernando Gomes, Kailany Bughi e Leonardo Pessoa  — **Projeto Integrador** do curso de **Desenvolvimento de Software Multiplataforma (DSM)** da **Fatec**.

---

<div align="center">

Feito com ❤️ pelo Grupo QuadCore · 2026

</div>
