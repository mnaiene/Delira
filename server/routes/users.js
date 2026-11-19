const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const asyncRoute = require('../asyncRoute');
const { requireAuth, requireAdmin } = require('../auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

const VALID_ROLES = ['admin', 'funcionario'];

router.get('/', asyncRoute(async (req, res) => {
  const rows = await db.all('SELECT id, name, email, role, active, created_at FROM users ORDER BY active DESC, name ASC');
  res.json(rows);
}));

router.post('/', asyncRoute(async (req, res) => {
  const { name, email, password, role } = req.body || {};
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Nome, e-mail e senha (mín. 6 caracteres) são obrigatórios' });
  }
  const finalRole = VALID_ROLES.includes(role) ? role : 'funcionario';
  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await db.get('SELECT id FROM users WHERE email = ?', [normalizedEmail]);
  if (existing) return res.status(400).json({ error: 'Já existe um usuário com esse e-mail' });

  const hash = bcrypt.hashSync(password, 10);
  const result = await db.run(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [name.trim(), normalizedEmail, hash, finalRole]
  );

  const row = await db.get('SELECT id, name, email, role, active, created_at FROM users WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(row);
}));

router.put('/:id', asyncRoute(async (req, res) => {
  const existing = await db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
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

  await db.run('UPDATE users SET name = ?, role = ?, active = ? WHERE id = ?', [
    next.name, next.role, next.active, existing.id,
  ]);

  if (body.password) {
    if (body.password.length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
    }
    const hash = bcrypt.hashSync(body.password, 10);
    await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, existing.id]);
  }

  res.json(await db.get('SELECT id, name, email, role, active, created_at FROM users WHERE id = ?', [existing.id]));
}));

router.delete('/:id', asyncRoute(async (req, res) => {
  const existing = await db.get('SELECT * FROM users WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Usuário não encontrado' });
  if (existing.id === req.user.sub) {
    return res.status(400).json({ error: 'Você não pode desativar a si mesmo' });
  }
  await db.run('UPDATE users SET active = 0 WHERE id = ?', [existing.id]);
  res.json({ ok: true });
}));

module.exports = router;
