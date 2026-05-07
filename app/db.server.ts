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
    role TEXT DEFAULT 'employee',
    goal TEXT DEFAULT '08:00',
    avatarUrl TEXT
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
    userId TEXT NOT NULL,
    FOREIGN KEY (userId) REFERENCES User(id),
    UNIQUE(userId, date)
  )
`);

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

// ÍNDICES EXTRAS PARA PERFORMANCE (Admin/Dashboard)
db.exec("CREATE INDEX IF NOT EXISTS idx_punch_date ON PunchRecord(date)");
db.exec("CREATE INDEX IF NOT EXISTS idx_shift_date ON Shift(date)");

