async function renderDashboardPage(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Dashboard</h1>
        <p class="subtitle">${isAdminUser() ? 'Visão geral do seu lava-rápido' : 'Seu desempenho no lava-rápido'}</p>
      </div>
    </div>
    <div id="dash-content">Carregando...</div>
  `;

  let data;
  try {
    data = await api.get('/dashboard/summary');
  } catch (err) {
    document.getElementById('dash-content').innerHTML = `<p class="error-msg">Erro ao carregar: ${err.message}</p>`;
    return;
  }

  const content = document.getElementById('dash-content');

  if (!isAdminUser()) {
    content.innerHTML = `
      ${simplePeriodSectionHtml('Hoje', data.today)}
      ${simplePeriodSectionHtml('Esta semana', data.week)}
      ${simplePeriodSectionHtml('Este mês', data.month)}

      <div class="panel">
        <h3>Seus últimos atendimentos</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Data</th><th>Serviço</th><th>Veículo</th><th>Pagamento</th><th>Status</th><th class="num">Valor</th></tr></thead>
            <tbody id="recent-body"></tbody>
          </table>
        </div>
      </div>
    `;
    renderRecentTable(document.getElementById('recent-body'), data.recent, false);
    return;
  }

  content.innerHTML = `
    ${periodSectionHtml('Hoje', data.today)}
    ${periodSectionHtml('Esta semana', data.week)}
    ${periodSectionHtml('Este mês', data.month)}

    <div class="two-col">
      <div class="panel">
        <h3>Receita dos últimos 7 dias</h3>
        <div id="chart-7d"></div>
      </div>
      <div class="panel">
        <h3>Formas de pagamento (mês)</h3>
        <div id="breakdown-payment"></div>
      </div>
    </div>

    <div class="two-col">
      <div class="panel">
        <h3>Gastos por categoria (mês)</h3>
        <div id="breakdown-expenses"></div>
      </div>
      <div class="panel">
        <h3>Serviços mais pedidos (mês)</h3>
        <div id="top-services"></div>
      </div>
    </div>

    <div class="two-col">
      <div class="panel">
        <h3>Atendimentos por funcionário (mês)</h3>
        <div id="breakdown-employees"></div>
      </div>
      <div class="panel">
        <h3>Últimos atendimentos</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Data</th><th>Serviço</th><th>Veículo</th><th>Atendido por</th><th class="num">Valor</th></tr></thead>
            <tbody id="recent-body"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  renderBarChart(document.getElementById('chart-7d'), data.last7days);
  renderBreakdown(document.getElementById('breakdown-payment'), data.paymentBreakdown, 'payment_method', 'total', PAYMENT_LABELS);
  renderBreakdown(document.getElementById('breakdown-expenses'), data.expenseBreakdown, 'category', 'total', EXPENSE_CATEGORY_LABELS);
  renderBreakdown(document.getElementById('breakdown-employees'), data.employeeBreakdown, 'employee_name', 'total');

  const topServicesEl = document.getElementById('top-services');
  if (!data.topServices.length) {
    topServicesEl.innerHTML = '<p class="empty-msg">Sem dados neste período.</p>';
  } else {
    topServicesEl.innerHTML = data.topServices.map((s) => `
      <div class="breakdown-row" style="grid-template-columns: 1fr 70px 90px;">
        <span class="bd-label">${s.service_name}</span>
        <span class="bd-value">${s.count}x</span>
        <span class="bd-value">${formatMoney(s.total)}</span>
      </div>
    `).join('');
  }

  renderRecentTable(document.getElementById('recent-body'), data.recent, true);
}

function renderRecentTable(tbody, rows, withEmployee) {
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-msg">Nenhum atendimento registrado ainda.</td></tr>`;
    return;
  }
  tbody.innerHTML = rows.map((r) => withEmployee ? `
    <tr>
      <td>${formatDate(r.served_at)}</td>
      <td>${r.service_name}</td>
      <td>${r.vehicle_plate || '-'}</td>
      <td>${r.created_by_name || '-'}</td>
      <td class="num">${formatMoney(r.price)}</td>
    </tr>
  ` : `
    <tr>
      <td>${formatDate(r.served_at)}</td>
      <td>${r.service_name}</td>
      <td>${r.vehicle_plate || '-'}</td>
      <td>${PAYMENT_LABELS[r.payment_method] || r.payment_method}</td>
      <td><span class="badge ${r.status}">${STATUS_LABELS[r.status] || r.status}</span></td>
      <td class="num">${formatMoney(r.price)}</td>
    </tr>
  `).join('');
}

function periodSectionHtml(title, totals) {
  const profitClass = totals.profit >= 0 ? 'good' : 'bad';
  return `
    <div class="period-section">
      <h2>${title}</h2>
      <div class="stat-grid">
        <div class="stat-tile">
          <div class="label">Receita</div>
          <div class="value">${formatMoney(totals.revenue)}</div>
        </div>
        <div class="stat-tile">
          <div class="label">Gastos</div>
          <div class="value">${formatMoney(totals.expenses)}</div>
        </div>
        <div class="stat-tile">
          <div class="label">Lucro</div>
          <div class="value ${profitClass}">${formatMoney(totals.profit)}</div>
        </div>
        <div class="stat-tile">
          <div class="label">Carros atendidos</div>
          <div class="value">${totals.cars}</div>
        </div>
      </div>
    </div>
  `;
}

function simplePeriodSectionHtml(title, totals) {
  return `
    <div class="period-section">
      <h2>${title}</h2>
      <div class="stat-grid">
        <div class="stat-tile">
          <div class="label">Receita gerada</div>
          <div class="value">${formatMoney(totals.revenue)}</div>
        </div>
        <div class="stat-tile">
          <div class="label">Carros atendidos</div>
          <div class="value">${totals.cars}</div>
        </div>
      </div>
    </div>
  `;
}
