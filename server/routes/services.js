const express = require('express');
const db = require('../db');
const { requireAuth, requireAdmin } = require('../auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const includeInactive = req.query.all === '1';
  const rows = includeInactive
    ? db.prepare('SELECT * FROM services ORDER BY active DESC, name ASC').all()
    : db.prepare('SELECT * FROM services WHERE active = 1 ORDER BY name ASC').all();
  res.json(rows);
});

router.post('/', requireAdmin, (req, res) => {
  const { name, price } = req.body || {};
  if (!name || typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: 'Nome e preço (número >= 0) são obrigatórios' });
  }
  const result = db.prepare('INSERT INTO services (name, price) VALUES (?, ?)').run(name.trim(), price);
  const row = db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(row);
});

router.put('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Serviço não encontrado' });
  const { name, price, active } = req.body || {};
  const next = {
    name: typeof name === 'string' && name.trim() ? name.trim() : existing.name,
    price: typeof price === 'number' && price >= 0 ? price : existing.price,
    active: typeof active === 'boolean' ? (active ? 1 : 0) : existing.active,
  };
  db.prepare('UPDATE services SET name = ?, price = ?, active = ? WHERE id = ?').run(
    next.name, next.price, next.active, existing.id
  );
  res.json(db.prepare('SELECT * FROM services WHERE id = ?').get(existing.id));
});

router.delete('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Serviço não encontrado' });
  const used = db.prepare('SELECT COUNT(*) AS n FROM wash_records WHERE service_id = ?').get(existing.id).n;
  if (used > 0) {
    db.prepare('UPDATE services SET active = 0 WHERE id = ?').run(existing.id);
    return res.json({ ok: true, deactivated: true });
  }
  db.prepare('DELETE FROM services WHERE id = ?').run(existing.id);
  res.json({ ok: true, deleted: true });
});

module.exports = router;
