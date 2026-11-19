const express = require('express');
const db = require('../db');
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

function periodTotals(startDate, endDate) {
  const revenueRow = db.prepare(`
    SELECT COALESCE(SUM(price), 0) AS total, COUNT(*) AS count
    FROM wash_records
    WHERE status = 'concluido' AND served_at BETWEEN ? AND ?
  `).get(startDate, endDate);

  const expenseRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM expenses
    WHERE expense_date BETWEEN ? AND ?
  `).get(startDate, endDate);

  return {
    revenue: revenueRow.total,
    cars: revenueRow.count,
    expenses: expenseRow.total,
    profit: revenueRow.total - expenseRow.total,
  };
}

router.get('/summary', (req, res) => {
  const now = new Date();
  const today = toISODate(now);
  const weekStart = toISODate(startOfWeek(now));
  const monthStart = today.slice(0, 7) + '-01';

  const result = {
    today: periodTotals(today, today),
    week: periodTotals(weekStart, today),
    month: periodTotals(monthStart, today),
  };

  // Last 7 days series (for chart)
  const series = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const iso = toISODate(d);
    const totals = periodTotals(iso, iso);
    series.push({ date: iso, revenue: totals.revenue, cars: totals.cars, expenses: totals.expenses });
  }
  result.last7days = series;

  // Payment method breakdown (this month)
  result.paymentBreakdown = db.prepare(`
    SELECT payment_method, COALESCE(SUM(price), 0) AS total, COUNT(*) AS count
    FROM wash_records
    WHERE status = 'concluido' AND served_at BETWEEN ? AND ?
    GROUP BY payment_method ORDER BY total DESC
  `).all(monthStart, today);

  // Expense category breakdown (this month)
  result.expenseBreakdown = db.prepare(`
    SELECT category, COALESCE(SUM(amount), 0) AS total
    FROM expenses
    WHERE expense_date BETWEEN ? AND ?
    GROUP BY category ORDER BY total DESC
  `).all(monthStart, today);

  // Top services (this month)
  result.topServices = db.prepare(`
    SELECT service_name, COUNT(*) AS count, COALESCE(SUM(price), 0) AS total
    FROM wash_records
    WHERE status = 'concluido' AND served_at BETWEEN ? AND ?
    GROUP BY service_name ORDER BY total DESC LIMIT 5
  `).all(monthStart, today);

  result.recent = db.prepare(`
    SELECT * FROM wash_records ORDER BY served_at DESC, id DESC LIMIT 8
  `).all();

  res.json(result);
});

module.exports = router;
