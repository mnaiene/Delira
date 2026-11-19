const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const asyncRoute = require('../asyncRoute');
const { signToken, setAuthCookie, clearAuthCookie, requireAuth } = require('../auth');

const router = express.Router();

router.post('/login', asyncRoute(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Informe email e senha' });
  }
  const user = await db.get('SELECT * FROM users WHERE email = ?', [String(email).toLowerCase().trim()]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Email ou senha inválidos' });
  }
  if (!user.active) {
    return res.status(401).json({ error: 'Usuário desativado. Fale com o administrador.' });
  }
  const token = signToken(user);
  setAuthCookie(res, token);
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
}));

router.post('/logout', (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ id: req.user.sub, name: req.user.name, email: req.user.email, role: req.user.role });
});

router.post('/change-password', requireAuth, asyncRoute(async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ error: 'Senha atual e nova senha (mín. 6 caracteres) são obrigatórias' });
  }
  const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.sub]);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Senha atual incorreta' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  await db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id]);
  res.json({ ok: true });
}));

module.exports = router;
