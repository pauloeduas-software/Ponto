import pg from "pg";

console.log("=== BANCO DE DADOS: INICIALIZANDO POSTGRESQL ===");

const postgresUrl = process.env.DATABASE_URL || "postgresql://postgres:postgrespassword@localhost:5432/ponto_db";

const pgPool = new pg.Pool({
  connectionString: postgresUrl,
  max: 20, 
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Mapeamento de colunas do Postgres (lowercase) para camelCase (padrão da aplicação)
const camelKeys: Record<string, string> = {
  avatarurl: "avatarUrl",
  teamid: "teamId",
  createdat: "createdAt",
  workmins: "workMins",
  diffmins: "diffMins",
  isovertime: "isOvertime",
  goalmins: "goalMins",
  userid: "userId",
  starttime: "startTime",
  endtime: "endTime",
  userteams: "userTeams",
  teamname: "teamName",
};

function normalizeRow(row: any): any {
  if (!row) return row;
  const newRow: any = {};
  for (const key of Object.keys(row)) {
    const camel = camelKeys[key.toLowerCase()];
    if (camel) {
      newRow[camel] = row[key];
    } else {
      newRow[key] = row[key];
    }
  }
  
  // Converte boolean do Postgres para 0/1 para compatibilidade estrita nas regras de negócio antigas
  if (newRow.isOvertime !== undefined) {
    if (typeof newRow.isOvertime === "boolean") {
      newRow.isOvertime = newRow.isOvertime ? 1 : 0;
    }
  }
  
  return newRow;
}

// Auxiliar para converter placeholders "?" para "$1, $2, ..." do Postgres e tratar a palavra reservada "User"
function translateSql(sql: string): string {
  let translated = sql;
  
  // Substitui "?" por "$1", "$2", etc.
  let count = 0;
  translated = translated.replace(/\?/g, () => {
    count++;
    return `$${count}`;
  });
  
  // O Postgres possui "User" como palavra reservada do sistema. Colocamos aspas duplas nela:
  translated = translated.replace(/\bUser\b/g, '"User"');
  return translated;
}

export const db = {
  prepare(sql: string) {
    const pgSql = translateSql(sql);
    
    return {
      async get(...params: any[]): Promise<any> {
        const res = await pgPool.query(pgSql, params);
        return normalizeRow(res.rows[0]);
      },
      
      async all(...params: any[]): Promise<any[]> {
        const res = await pgPool.query(pgSql, params);
        return res.rows.map(normalizeRow);
      },
      
      async run(...params: any[]): Promise<any> {
        const res = await pgPool.query(pgSql, params);
        return { changes: res.rowCount, lastInsertRowid: undefined };
      }
    };
  },
  
  async exec(sql: string): Promise<void> {
    await pgPool.query(sql);
  }
};
