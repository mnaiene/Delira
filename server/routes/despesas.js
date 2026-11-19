const express = require('express');
const db = require('../db');
const asyncRoute = require('../asyncRoute');
const { requireAuth, requireAdmin } = require('../auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

const VALID_CATEGORIES = ['produtos', 'salarios', 'agua_luz', 'manutencao', 'aluguel', 'outros'];

router.get('/', asyncRoute(async (req, res) => {
  const { from, to, category } = req.query;
  let sql = 'SELECT * FROM expenses WHERE 1=1';
  const params = [];
  if (from) {
    sql += ' AND expense_date >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND expense_date <= ?';
    params.push(to);
  }
  if (category && VALID_CATEGORIES.includes(category)) {
    sql += ' AND category = ?';
    params.push(category);
  }
  sql += ' ORDER BY expense_date DESC, id DESC LIMIT 500';
  res.json(await db.all(sql, params));
}));

router.post('/', asyncRoute(async (req, res) => {
  const { description, category, amount, expense_date } = req.body || {};
  if (!description || typeof amount !== 'number' || amount < 0) {
    return res.status(400).json({ error: 'Descrição e valor (número >= 0) são obrigatórios' });
  }
  const cat = VALID_CATEGORIES.includes(category) ? category : 'outros';
  const date = expense_date || new Date().toISOString().slice(0, 10);
  const result = await db.run(
    'INSERT INTO expenses (description, category, amount, expense_date, created_by) VALUES (?, ?, ?, ?, ?)',
    [description.trim(), cat, amount, date, req.user.sub]
  );
  res.status(201).json(await db.get('SELECT * FROM expenses WHERE id = ?', [result.lastInsertRowid]));
}));

router.put('/:id', asyncRoute(async (req, res) => {
  const existing = await db.get('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Despesa não encontrada' });
  const body = req.body || {};
  const next = {
    description: typeof body.description === 'string' && body.description.trim() ? body.description.trim() : existing.description,
    category: VALID_CATEGORIES.includes(body.category) ? body.category : existing.category,
    amount: typeof body.amount === 'number' && body.amount >= 0 ? body.amount : existing.amount,
    expense_date: body.expense_date || existing.expense_date,
  };
  await db.run('UPDATE expenses SET description=?, category=?, amount=?, expense_date=? WHERE id=?', [
    next.description, next.category, next.amount, next.expense_date, existing.id,
  ]);
  res.json(await db.get('SELECT * FROM expenses WHERE id = ?', [existing.id]));
}));

router.delete('/:id', asyncRoute(async (req, res) => {
  const existing = await db.get('SELECT * FROM expenses WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Despesa não encontrada' });
  await db.run('DELETE FROM expenses WHERE id = ?', [existing.id]);
  res.json({ ok: true });
}));

module.exports = router;
