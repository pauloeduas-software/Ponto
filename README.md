# Ponto

[![React Router](https://img.shields.io/badge/React_Router-v7-CA4245?logo=react-router)](https://reactrouter.com)
[![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![SQLite](https://img.shields.io/badge/SQLite-Lighter-003B57?logo=sqlite)](https://sqlite.org)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://www.docker.com)
[![Lucide React](https://img.shields.io/badge/Lucide-Icons-F72C5B?logo=lucide)](https://lucide.dev)

O **Ponto** é uma solução corporativa robusta para controle de jornada de trabalho e gestão de escalas em múltiplas equipes. Com uma interface moderna baseada em **Glassmorphism**, o sistema oferece uma experiência premium e intuitiva para colaboradores e gerentes.

---

## ✨ Funcionalidades Principais

- **⏱️ Registro de Ponto Inteligente:** Interface intuitiva com detecção automática de virada de dia e cálculo de saldo (extra/negativo) em tempo real. Suporte a múltiplos períodos e registro manual.
- **📊 Histórico e Dashboard:** Painel individual de estatísticas mensais com análise de saldo acumulado. Permite a edição e exclusão granular de batidas específicas, garantindo flexibilidade na correção de registros.
- **🧮 Simulador de Horas Inteligente:** Ferramenta avançada para planejamento semanal que calcula automaticamente compensações de débito ou uso de crédito de horas extras.
- **📅 Escala Mensal Dinâmica:** Sistema de planejamento de equipe com interface de calendário interativa. Permite alternar escalas de trabalho e folgas com Salvamento Automático, eliminando a necessidade de botões de confirmação.
- **👤 Perfil Consolidado:** Badges dinâmicos que mostram Cargo e Equipe. Personalização de Avatar via Base64 e Meta de Horas individualizada.
- **🎨 UI/UX:** Design consistente em todas as rotas (Histórico, Relatórios, Escala) com navegação temporal fixa e alinhada, evitando quebras de layout.
- **🛡️ Painel de Gestão Avançado:** 
    - Criação e organização de equipes.
    - **Reset de Senha:** Administradores podem redefinir senhas de usuários diretamente pela interface.
    - **Exclusão de Contas:** Remoção permanente de usuários com limpeza automática de registros vinculados.
- **🏢 Múltiplos Vínculos e Acesso Granular:**
    - **Multi-Equipes:** Suporte estrutural para que o mesmo colaborador pertença a várias equipes de forma simultânea.
    - **Cargos Independentes por Contexto:** Um usuário pode ser *Gerente* na "Equipe A" e um *Funcionário* comum na "Equipe B". O sistema adequa as permissões dinamicamente.
    - **Admin:** Acesso irrestrito a todos os setores de forma unificada.
- **🔐 Segurança e Hardening:**
   - Senhas criptografadas com bcrypt.
   - Sessões protegidas com cookies HttpOnly e política SameSite: Strict.
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
| **Segurança** | Bcryptjs (Criptografia de Senhas) & Cookie Session storage |
| **Ícones**| Lucide React |

---

## 📂 Estrutura Arquitetural

```text
├── app/
│   ├── components/        # Componentes UI reutilizáveis (Modal, StatCard, etc.)
│   ├── routes/            # Rotas, Loaders e Actions (Admin, Escala, Management, Profile)
│   ├── utils/             # Lógica de cálculo de tempo e manipulação de calendário
│   ├── db.server.ts       # Camada de persistência SQLite
│   ├── session.server.ts  # Autenticação e proteção de rotas (RBAC)
│   └── types.ts           # Definições de tipos compartilhados
├── data/                  # Persistência do banco de dados SQLite
├── public/                # Ativos estáticos
└── Dockerfile             # Configuração para deploy conteinerizado
```

---

## 🏁 Primeiros Passos

### Instalação e Execução

1. **Instale as dependências**
   ```bash
   npm install
   ```

2. **Inicie o Servidor de Desenvolvimento**
   ```bash
   npm run dev
   ```

3. **Produção (Build)**
   ```bash
   npm run build
   npm start
   ```

---