const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../auth');

const router = express.Router();
router.use(requireAuth, requireAdmin);

const VALID_CATEGORIES = ['produtos', 'salarios', 'agua_luz', 'manutencao', 'aluguel', 'outros'];

router.get('/', (req, res) => {
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
  res.json(db.prepare(sql).all(...params));
});

router.post('/', (req, res) => {
  const { description, category, amount, expense_date } = req.body || {};
  if (!description || typeof amount !== 'number' || amount < 0) {
    return res.status(400).json({ error: 'Descrição e valor (número >= 0) são obrigatórios' });
  }
  const cat = VALID_CATEGORIES.includes(category) ? category : 'outros';
  const date = expense_date || new Date().toISOString().slice(0, 10);
  const result = db.prepare(
    'INSERT INTO expenses (description, category, amount, expense_date, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run(description.trim(), cat, amount, date, req.user.sub);
  res.status(201).json(db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Despesa não encontrada' });
  const body = req.body || {};
  const next = {
    description: typeof body.description === 'string' && body.description.trim() ? body.description.trim() : existing.description,
    category: VALID_CATEGORIES.includes(body.category) ? body.category : existing.category,
    amount: typeof body.amount === 'number' && body.amount >= 0 ? body.amount : existing.amount,
    expense_date: body.expense_date || existing.expense_date,
  };
  db.prepare('UPDATE expenses SET description=?, category=?, amount=?, expense_date=? WHERE id=?').run(
    next.description, next.category, next.amount, next.expense_date, existing.id
  );
  res.json(db.prepare('SELECT * FROM expenses WHERE id = ?').get(existing.id));
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Despesa não encontrada' });
  db.prepare('DELETE FROM expenses WHERE id = ?').run(existing.id);
  res.json({ ok: true });
});

module.exports = router;
