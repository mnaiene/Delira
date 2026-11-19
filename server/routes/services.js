const express = require('express');
const db = require('../db');
const asyncRoute = require('../asyncRoute');
const { requireAuth, requireAdmin } = require('../auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', asyncRoute(async (req, res) => {
  const includeInactive = req.query.all === '1';
  const rows = includeInactive
    ? await db.all('SELECT * FROM services ORDER BY active DESC, name ASC')
    : await db.all('SELECT * FROM services WHERE active = 1 ORDER BY name ASC');
  res.json(rows);
}));

router.post('/', requireAdmin, asyncRoute(async (req, res) => {
  const { name, price } = req.body || {};
  if (!name || typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: 'Nome e preço (número >= 0) são obrigatórios' });
  }
  const result = await db.run('INSERT INTO services (name, price) VALUES (?, ?)', [name.trim(), price]);
  const row = await db.get('SELECT * FROM services WHERE id = ?', [result.lastInsertRowid]);
  res.status(201).json(row);
}));

router.put('/:id', requireAdmin, asyncRoute(async (req, res) => {
  const existing = await db.get('SELECT * FROM services WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Serviço não encontrado' });
  const { name, price, active } = req.body || {};
  const next = {
    name: typeof name === 'string' && name.trim() ? name.trim() : existing.name,
    price: typeof price === 'number' && price >= 0 ? price : existing.price,
    active: typeof active === 'boolean' ? (active ? 1 : 0) : existing.active,
  };
  await db.run('UPDATE services SET name = ?, price = ?, active = ? WHERE id = ?', [
    next.name, next.price, next.active, existing.id,
  ]);
  res.json(await db.get('SELECT * FROM services WHERE id = ?', [existing.id]));
}));

router.delete('/:id', requireAdmin, asyncRoute(async (req, res) => {
  const existing = await db.get('SELECT * FROM services WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Serviço não encontrado' });
  const usedRow = await db.get('SELECT COUNT(*) AS n FROM wash_records WHERE service_id = ?', [existing.id]);
  if (Number(usedRow.n) > 0) {
    await db.run('UPDATE services SET active = 0 WHERE id = ?', [existing.id]);
    return res.json({ ok: true, deactivated: true });
  }
  await db.run('DELETE FROM services WHERE id = ?', [existing.id]);
  res.json({ ok: true, deleted: true });
}));

module.exports = router;
