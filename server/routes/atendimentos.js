const express = require('express');
const db = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

const VALID_STATUS = ['em_andamento', 'concluido', 'cancelado'];
const VALID_PAYMENT = ['dinheiro', 'pix', 'cartao_debito', 'cartao_credito', 'outro'];

router.get('/', (req, res) => {
  const { from, to, status } = req.query;
  let sql = 'SELECT * FROM wash_records WHERE 1=1';
  const params = [];
  if (from) {
    sql += ' AND served_at >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND served_at <= ?';
    params.push(to);
  }
  if (status && VALID_STATUS.includes(status)) {
    sql += ' AND status = ?';
    params.push(status);
  }
  sql += ' ORDER BY served_at DESC, id DESC LIMIT 500';
  res.json(db.prepare(sql).all(...params));
});

router.post('/', (req, res) => {
  const body = req.body || {};
  let { service_id, service_name, price, customer_name, vehicle_plate, vehicle_model,
    vehicle_type, payment_method, status, notes, served_at } = body;

  if (service_id) {
    const svc = db.prepare('SELECT * FROM services WHERE id = ?').get(service_id);
    if (svc) {
      service_name = service_name || svc.name;
      if (price === undefined || price === null) price = svc.price;
    }
  }

  if (!service_name || typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: 'Serviço e preço (número >= 0) são obrigatórios' });
  }
  status = VALID_STATUS.includes(status) ? status : 'concluido';
  payment_method = VALID_PAYMENT.includes(payment_method) ? payment_method : 'dinheiro';
  vehicle_type = vehicle_type || 'carro';
  served_at = served_at || new Date().toISOString().slice(0, 10);

  const result = db.prepare(`
    INSERT INTO wash_records
      (service_id, service_name, price, customer_name, vehicle_plate, vehicle_model,
       vehicle_type, payment_method, status, notes, created_by, served_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    service_id || null, service_name.trim(), price, customer_name || null,
    vehicle_plate ? vehicle_plate.toUpperCase().trim() : null, vehicle_model || null,
    vehicle_type, payment_method, status, notes || null, req.user.sub, served_at
  );

  res.status(201).json(db.prepare('SELECT * FROM wash_records WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM wash_records WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Atendimento não encontrado' });
  const body = req.body || {};

  const next = {
    service_name: typeof body.service_name === 'string' && body.service_name.trim() ? body.service_name.trim() : existing.service_name,
    price: typeof body.price === 'number' && body.price >= 0 ? body.price : existing.price,
    customer_name: body.customer_name !== undefined ? body.customer_name : existing.customer_name,
    vehicle_plate: body.vehicle_plate !== undefined ? (body.vehicle_plate ? body.vehicle_plate.toUpperCase().trim() : null) : existing.vehicle_plate,
    vehicle_model: body.vehicle_model !== undefined ? body.vehicle_model : existing.vehicle_model,
    vehicle_type: body.vehicle_type || existing.vehicle_type,
    payment_method: VALID_PAYMENT.includes(body.payment_method) ? body.payment_method : existing.payment_method,
    status: VALID_STATUS.includes(body.status) ? body.status : existing.status,
    notes: body.notes !== undefined ? body.notes : existing.notes,
    served_at: body.served_at || existing.served_at,
  };

  db.prepare(`
    UPDATE wash_records SET service_name=?, price=?, customer_name=?, vehicle_plate=?, vehicle_model=?,
      vehicle_type=?, payment_method=?, status=?, notes=?, served_at=? WHERE id=?
  `).run(
    next.service_name, next.price, next.customer_name, next.vehicle_plate, next.vehicle_model,
    next.vehicle_type, next.payment_method, next.status, next.notes, next.served_at, existing.id
  );

  res.json(db.prepare('SELECT * FROM wash_records WHERE id = ?').get(existing.id));
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM wash_records WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Atendimento não encontrado' });
  db.prepare('DELETE FROM wash_records WHERE id = ?').run(existing.id);
  res.json({ ok: true });
});

module.exports = router;
