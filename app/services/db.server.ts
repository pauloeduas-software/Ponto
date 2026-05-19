import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

// Em produção/docker, precisamos de um caminho específico para persistência de dados
const dbPath = process.env.DATABASE_URL?.replace("file:", "") || path.join(process.cwd(), "data", "dev.db");

// Garante que o diretório do banco de dados exista
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);

// --- Otimizações de Performance do SQLite ---
// WAL: Permite leituras e escritas simultâneas (essencial para múltiplos usuários)
db.pragma("journal_mode = WAL");
// Cache de 4MB em memória para evitar leituras repetidas do disco
db.pragma("cache_size = -4000");
// Tabelas temporárias ficam na memória RAM (mais rápido que disco)
db.pragma("temp_store = MEMORY");
// Memória mapeada de 128MB para acesso ultrarrápido ao banco
db.pragma("mmap_size = 134217728");
// Sincronização balanceada: rápido e seguro (NORMAL vs FULL)
db.pragma("synchronous = NORMAL");


// Inicialização das tabelas do banco de dados
db.exec(`
  CREATE TABLE IF NOT EXISTS User (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'employee', -- 'admin', 'manager', 'employee'
    goal TEXT DEFAULT '08:00',
    avatarUrl TEXT,
    teamId TEXT,
    FOREIGN KEY (teamId) REFERENCES Team(id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS Team (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS PunchRecord (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    punches TEXT NOT NULL,
    workMins INTEGER DEFAULT 0,
    diffMins INTEGER DEFAULT 0,
    isOvertime BOOLEAN DEFAULT 0,
    goalMins INTEGER DEFAULT 480,
    userId TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES User(id),
    UNIQUE(userId, date)
  )
`);

// MIGRATIONS (Executa apenas se necessário)
try {
  db.exec("ALTER TABLE PunchRecord ADD COLUMN goalMins INTEGER DEFAULT 480");
} catch (e) {
  // Coluna já existe ou erro na migração
}

try {
  db.exec("ALTER TABLE User ADD COLUMN teamId TEXT");
} catch (e) {
  // Coluna já existe
}

db.exec(`
  CREATE TABLE IF NOT EXISTS Shift (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    date TEXT NOT NULL,
    startTime TEXT DEFAULT '08:00',
    endTime TEXT DEFAULT '18:00',
    type TEXT DEFAULT 'TRABALHO',
    FOREIGN KEY (userId) REFERENCES User(id),
    UNIQUE(userId, date)
  )
`);

// Tabela de vínculos N:N entre usuários e equipes (com cargo por equipe)
db.exec(`
  CREATE TABLE IF NOT EXISTS UserTeam (
    userId TEXT NOT NULL,
    teamId TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'employee',
    PRIMARY KEY (userId, teamId),
    FOREIGN KEY (userId) REFERENCES User(id),
    FOREIGN KEY (teamId) REFERENCES Team(id)
  )
`);

// MIGRAÇÃO: popula UserTeam a partir dos vínculos existentes em User.teamId
// Só insere se ainda não existir o registro (idempotente)
try {
  db.exec(`
    INSERT OR IGNORE INTO UserTeam (userId, teamId, role)
    SELECT id, teamId, role
    FROM User
    WHERE teamId IS NOT NULL AND role IN ('manager', 'employee')
  `);
} catch (e) {
  // Migração já executada ou erro ignorável
}

// ÍNDICES EXTRAS PARA PERFORMANCE (Admin/Dashboard)
db.exec("CREATE INDEX IF NOT EXISTS idx_punch_date ON PunchRecord(date)");
db.exec("CREATE INDEX IF NOT EXISTS idx_shift_date ON Shift(date)");

// Limpeza automática de avatares antigos gigantescos para restaurar a performance instantânea das trocas de página
try {
  db.exec("UPDATE User SET avatarUrl = NULL WHERE avatarUrl IS NOT NULL AND LENGTH(avatarUrl) > 50000");
} catch (e) {
  // Ignora se der erro
}

