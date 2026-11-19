const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'carwash.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
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

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (userCount === 0) {
    const email = process.env.ADMIN_EMAIL || 'admin@delira.com';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = bcrypt.hashSync(password, 10);
    db.prepare(
      'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
    ).run('Administrador', email, hash, 'admin');
    console.log(`[seed] Usuário admin criado: ${email} / ${password} (troque a senha depois de entrar)`);
  }

  const serviceCount = db.prepare('SELECT COUNT(*) AS n FROM services').get().n;
  if (serviceCount === 0) {
    const defaults = [
      ['Lavagem Simples', 30],
      ['Lavagem Completa', 50],
      ['Lavagem + Enceramento', 80],
      ['Higienização Interna', 100],
      ['Lavagem de Motor', 40],
    ];
    const insert = db.prepare('INSERT INTO services (name, price) VALUES (?, ?)');
    const insertMany = db.transaction((rows) => {
      for (const row of rows) insert.run(...row);
    });
    insertMany(defaults);
    console.log('[seed] Serviços padrão criados');
  }
}

seed();

module.exports = db;
