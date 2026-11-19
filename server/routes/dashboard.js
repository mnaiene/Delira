const express = require('express');
const db = require('../db');
const asyncRoute = require('../asyncRoute');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getUTCDay(); // 0 = Sunday
  const diff = (day === 0 ? 6 : day - 1); // days since Monday
  date.setUTCDate(date.getUTCDate() - diff);
  return date;
}

async function periodTotals(startDate, endDate) {
  const revenueRow = await db.get(`
    SELECT COALESCE(SUM(price), 0) AS total, COUNT(*) AS count
    FROM wash_records
    WHERE status = 'concluido' AND served_at BETWEEN ? AND ?
  `, [startDate, endDate]);

  const expenseRow = await db.get(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM expenses
    WHERE expense_date BETWEEN ? AND ?
  `, [startDate, endDate]);

  const revenue = Number(revenueRow.total);
  const expenses = Number(expenseRow.total);

  return {
    revenue,
    cars: Number(revenueRow.count),
    expenses,
    profit: revenue - expenses,
  };
}

async function personalTotals(userId, startDate, endDate) {
  const row = await db.get(`
    SELECT COALESCE(SUM(price), 0) AS total, COUNT(*) AS count
    FROM wash_records
    WHERE status = 'concluido' AND created_by = ? AND served_at BETWEEN ? AND ?
  `, [userId, startDate, endDate]);
  return { revenue: Number(row.total), cars: Number(row.count) };
}

router.get('/summary', asyncRoute(async (req, res) => {
  const now = new Date();
  const today = toISODate(now);
  const weekStart = toISODate(startOfWeek(now));
  const monthStart = today.slice(0, 7) + '-01';

  if (req.user.role !== 'admin') {
    const [todayTotals, weekTotals, monthTotals, recent] = await Promise.all([
      personalTotals(req.user.sub, today, today),
      personalTotals(req.user.sub, weekStart, today),
      personalTotals(req.user.sub, monthStart, today),
      db.all('SELECT * FROM wash_records WHERE created_by = ? ORDER BY served_at DESC, id DESC LIMIT 8', [req.user.sub]),
    ]);
    return res.json({ today: todayTotals, week: weekTotals, month: monthTotals, recent });
  }

  const result = {
    today: await periodTotals(today, today),
    week: await periodTotals(weekStart, today),
    month: await periodTotals(monthStart, today),
  };

  // Last 7 days series (for chart)
  const series = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const iso = toISODate(d);
    const totals = await periodTotals(iso, iso);
    series.push({ date: iso, revenue: totals.revenue, cars: totals.cars, expenses: totals.expenses });
  }
  result.last7days = series;

  // Payment method breakdown (this month)
  result.paymentBreakdown = (await db.all(`
    SELECT payment_method, COALESCE(SUM(price), 0) AS total, COUNT(*) AS count
    FROM wash_records
    WHERE status = 'concluido' AND served_at BETWEEN ? AND ?
    GROUP BY payment_method ORDER BY total DESC
  `, [monthStart, today])).map((r) => ({ ...r, total: Number(r.total), count: Number(r.count) }));

  // Expense category breakdown (this month)
  result.expenseBreakdown = (await db.all(`
    SELECT category, COALESCE(SUM(amount), 0) AS total
    FROM expenses
    WHERE expense_date BETWEEN ? AND ?
    GROUP BY category ORDER BY total DESC
  `, [monthStart, today])).map((r) => ({ ...r, total: Number(r.total) }));

  // Top services (this month)
  result.topServices = (await db.all(`
    SELECT service_name, COUNT(*) AS count, COALESCE(SUM(price), 0) AS total
    FROM wash_records
    WHERE status = 'concluido' AND served_at BETWEEN ? AND ?
    GROUP BY service_name ORDER BY total DESC LIMIT 5
  `, [monthStart, today])).map((r) => ({ ...r, total: Number(r.total), count: Number(r.count) }));

  // Atendimentos por funcionário (este mês)
  result.employeeBreakdown = (await db.all(`
    SELECT COALESCE(u.name, 'Sem usuário') AS employee_name, COUNT(*) AS count, COALESCE(SUM(w.price), 0) AS total
    FROM wash_records w
    LEFT JOIN users u ON u.id = w.created_by
    WHERE w.status = 'concluido' AND w.served_at BETWEEN ? AND ?
    GROUP BY w.created_by ORDER BY total DESC
  `, [monthStart, today])).map((r) => ({ ...r, total: Number(r.total), count: Number(r.count) }));

  result.recent = await db.all(`
    SELECT w.*, u.name AS created_by_name
    FROM wash_records w
    LEFT JOIN users u ON u.id = w.created_by
    ORDER BY w.served_at DESC, w.id DESC LIMIT 8
  `);

  res.json(result);
}));

module.exports = router;
