const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { createClient } = require('@libsql/client');

const DATA_DIR = path.join(__dirname, '..', 'data');
const usingTurso = !!process.env.TURSO_DATABASE_URL;

if (!usingTurso && !fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const url = process.env.TURSO_DATABASE_URL || `file:${path.join(DATA_DIR, 'carwash.db')}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient(authToken ? { url, authToken } : { url });

async function execRaw(sql) {
  const statements = sql.split(';').map((s) => s.trim()).filter(Boolean);
  for (const statement of statements) {
    await client.execute(statement);
  }
}

async function getRaw(sql, args = []) {
  const result = await client.execute({ sql, args });
  return result.rows[0];
}

async function allRaw(sql, args = []) {
  const result = await client.execute({ sql, args });
  return result.rows;
}

async function runRaw(sql, args = []) {
  const result = await client.execute({ sql, args });
  return {
    lastInsertRowid: result.lastInsertRowid === undefined ? undefined : Number(result.lastInsertRowid),
    changes: result.rowsAffected,
  };
}

async function initSchema() {
  await execRaw(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS wash_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
      service_name TEXT NOT NULL,
      price REAL NOT NULL,
      customer_name TEXT,
      vehicle_plate TEXT,
      vehicle_model TEXT,
      vehicle_type TEXT NOT NULL DEFAULT 'carro',
      payment_method TEXT NOT NULL DEFAULT 'dinheiro',
      status TEXT NOT NULL DEFAULT 'concluido',
      notes TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      served_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'outros',
      amount REAL NOT NULL,
      expense_date TEXT NOT NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_wash_records_served_at ON wash_records(served_at);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
  `);

  // Migração: bancos criados antes da coluna 'active' existir em users
  try {
    const cols = await allRaw("PRAGMA table_info(users)");
    if (!cols.some((c) => c.name === 'active')) {
      await execRaw("ALTER TABLE users ADD COLUMN active INTEGER NOT NULL DEFAULT 1");
    }
  } catch (err) {
    console.warn('[db] Não foi possível checar/migrar a coluna active:', err.message);
  }
}

async function seed() {
  const userCountRow = await getRaw('SELECT COUNT(*) AS n FROM users');
  if (Number(userCountRow.n) === 0) {
    const email = process.env.ADMIN_EMAIL || 'admin@kawash.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = bcrypt.hashSync(password, 10);
    try {
      await runRaw(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
        ['Administrador', email, hash, 'admin']
      );
      console.log(`[seed] Usuário admin criado: ${email} / ${password} (troque a senha depois de entrar)`);
    } catch (err) {
      console.warn('[seed] Não foi possível criar o admin padrão (provavelmente já existe):', err.message);
    }
  }

  const serviceCountRow = await getRaw('SELECT COUNT(*) AS n FROM services');
  if (Number(serviceCountRow.n) === 0) {
    const defaults = [
      ['Lavagem Simples', 30],
      ['Lavagem Completa', 50],
      ['Lavagem + Enceramento', 80],
      ['Higienização Interna', 100],
      ['Lavagem de Motor', 40],
    ];
    for (const [name, price] of defaults) {
      await runRaw('INSERT INTO services (name, price) VALUES (?, ?)', [name, price]);
    }
    console.log('[seed] Serviços padrão criados');
  }
}

const ready = (async () => {
  await initSchema();
  await seed();
})().catch((err) => {
  console.error('[db] Falha ao inicializar o banco:', err);
  throw err;
});

module.exports = {
  ready,
  async get(sql, args = []) {
    await ready;
    return getRaw(sql, args);
  },
  async all(sql, args = []) {
    await ready;
    return allRaw(sql, args);
  },
  async run(sql, args = []) {
    await ready;
    return runRaw(sql, args);
  },
};
