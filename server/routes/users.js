const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

const VALID_ROLES = ['admin', 'funcionario'];

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT id, name, email, role, active, created_at FROM users ORDER BY active DESC, name ASC').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Nome, e-mail e senha (mín. 6 caracteres) são obrigatórios' });
  }
  const finalRole = VALID_ROLES.includes(role) ? role : 'funcionario';
  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) return res.status(400).json({ error: 'Já existe um usuário com esse e-mail' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)'
  ).run(name.trim(), normalizedEmail, hash, finalRole);

  const row = db.prepare('SELECT id, name, email, role, active, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Usuário não encontrado' });
  const body = req.body || {};

  if (existing.id === req.user.sub && body.active === false) {
    return res.status(400).json({ error: 'Você não pode desativar a si mesmo' });
  }

  const next = {
    name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : existing.name,
    role: VALID_ROLES.includes(body.role) ? body.role : existing.role,
    active: typeof body.active === 'boolean' ? (body.active ? 1 : 0) : existing.active,
  };

  db.prepare('UPDATE users SET name = ?, role = ?, active = ? WHERE id = ?').run(
    next.name, next.role, next.active, existing.id
  );

  if (body.password) {
    if (body.password.length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
    }
    const hash = bcrypt.hashSync(body.password, 10);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, existing.id);
  }

  res.json(db.prepare('SELECT id, name, email, role, active, created_at FROM users WHERE id = ?').get(existing.id));
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (existing.id === req.user.sub) {
    return res.status(400).json({ error: 'Você não pode desativar a si mesmo' });
  }
  db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(existing.id);
  res.json({ ok: true });
});

module.exports = router;
