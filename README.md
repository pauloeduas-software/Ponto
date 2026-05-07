# 🕒 Ponto

[![React Router](https://img.shields.io/badge/React_Router-v7-CA4245?logo=react-router)](https://reactrouter.com)
[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![SQLite](https://img.shields.io/badge/SQLite-Lighter-003B57?logo=sqlite)](https://sqlite.org)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com)
[![Lucide React](https://img.shields.io/badge/Lucide-Icons-F72C5B?logo=lucide)](https://lucide.dev)

O **Ponto** é uma solução corporativa para controle de jornada de trabalho e escala. Com uma interface moderna em **Glassmorphism**, o sistema oferece uma experiência fluida para registro de horários, gestão de escalas e monitoramento administrativo em tempo real.

---

## ✨ Funcionalidades Principais

- **⏱️ Registro de Ponto Inteligente:** Interface intuitiva para batimento de ponto com detecção automática de virada de dia (meia-noite) e cálculo de saldo (extra/negativo) em tempo real. Inclui suporte a múltiplos períodos e "Registro Manual" para ajustes rápidos.
- **📅 Escala Mensal Dinâmica:** Sistema de planejamento de equipe com interface de calendário interativa. Permite alternar escalas de trabalho e folgas com **Salvamento Automático**, eliminando a necessidade de botões de confirmação.
- **🛡️ Painel Administrativo:** Central de monitoramento para gestores com visão consolidada de toda a equipe. Inclui busca por colaborador, calendários de alta densidade com avatares e modais de relatório detalhados.
- **👤 Perfil e Personalização:** Gestão de identidade com upload de fotos (Avatar) via Base64, edição de nome de exibição e configuração de **Meta de Horas Diárias** personalizada para cada usuario.
- **📊 Histórico e Dashboard:** Painel individual de estatísticas mensais com análise de saldo acumulado. Permite a edição e **exclusão granular** de batidas específicas, garantindo flexibilidade na correção de registros.
- **🎨 Design System Premium:** Interface construída com CSS Vanilla puro, utilizando técnicas avançadas de **Glassmorphism**, modo escuro nativo, micro-animações suaves e design responsivo otimizado.
- **🔐 Segurança e Hardening:** 
    - Senhas criptografadas com `bcrypt`.
    - Sessões protegidas com cookies `HttpOnly` e política `SameSite: Strict`.
    - Controle de acesso (RBAC) validando permissões de Admin vs Funcionário diretamente no servidor.
    - Proteção contra SQL Injection via consultas preparadas (Prepared Statements).

---

## 🛠️ Tech Stack

| Categoria | Tecnologia |
| :--- | :--- |
| **Framework** | React Router v7 (Framework Mode) |
| **Ambiente** | Node.js / Runtime compatível |
| **Linguagem** | TypeScript |
| **Banco de Dados** | SQLite (better-sqlite3) |
| **Estilização** | CSS Vanilla (Glassmorphism & Flexbox/Grid) |
| **Segurança** | Bcryptjs (Hash) & Cookie Session Storage |
| **Ícones**| Lucide React |

---

## 📂 Estrutura Arquitetural

```text
├── app/
│   ├── components/        # Componentes UI (Ex: Modal, StatCard)
│   ├── routes/            # Rotas e Actions (Home, Admin, Escala, Dashboard, Perfil)
│   ├── utils/             # Helpers de tempo (Time/Minutes) e lógica de Calendário
│   ├── db.server.ts       # Inicialização e persistência do SQLite
│   ├── session.server.ts  # Gestão de Sessão, Cookies e RBAC
│   ├── root.tsx           # Layout Global e Navegação Lateral
│   └── types.ts           # Definições de tipos do sistema
├── data/                  # Diretório persistente do banco de dados (SQLite)
├── scripts/               # Scripts de utilidade e manutenção
├── public/                # Ativos estáticos e fontes
└── Dockerfile             # Configuração para deploy em containers (Dokploy)
```

---

## 🏁 Primeiros Passos

### Pré-requisitos
- **Node.js** (LTS recomendado) instalado.

### Instalação e Execução

1. **Instale as dependências**
   ```bash
   npm install
   ```

2. **Inicialize o Banco de Dados**
   O banco SQLite será criado automaticamente na primeira execução dentro da pasta `/data`.

3. **Inicie o Servidor de Desenvolvimento**
   ```bash
   npm run dev
   ```

4. **Produção (Build)**
   ```bash
   npm run build
   npm start
   ```

---

## 🐋 Deploy (Docker/Dokploy)

O projeto está pronto para deploy em containers. Certifique-se de mapear um **volume** para o diretório `/app/data` para garantir que as informações dos colaboradores não sejam perdidas entre atualizações.

---
