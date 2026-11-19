async function renderHistoricoPage(container, user) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Histórico — ${user.name}</h1>
        <p class="subtitle">${user.email}</p>
      </div>
      <button class="btn secondary" style="width:auto" id="back-to-users-btn">← Voltar para Usuários</button>
    </div>

    <div class="toolbar">
      <div class="field">
        <label>De</label>
        <input type="date" id="hist-from" />
      </div>
      <div class="field">
        <label>Até</label>
        <input type="date" id="hist-to" />
      </div>
      <button class="btn secondary" style="width:auto" id="hist-filter-btn">Filtrar</button>
    </div>

    <div class="stat-grid" id="hist-summary" style="margin-bottom:20px"></div>

    <div class="panel">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Data</th><th>Serviço</th><th>Veículo</th><th>Pagamento</th><th>Status</th><th class="num">Valor</th></tr></thead>
          <tbody id="hist-body"><tr><td colspan="6">Carregando...</td></tr></tbody>
        </table>
      </div>
    </div>
  `;

  const today = todayISO();
  const monthStart = today.slice(0, 7) + '-01';
  document.getElementById('hist-from').value = monthStart;
  document.getElementById('hist-to').value = today;

  document.getElementById('back-to-users-btn').addEventListener('click', () => renderUsuariosPage(container));
  document.getElementById('hist-filter-btn').addEventListener('click', () => loadHistorico(user.id));

  await loadHistorico(user.id);
}

async function loadHistorico(userId) {
  const from = document.getElementById('hist-from').value;
  const to = document.getElementById('hist-to').value;
  const params = new URLSearchParams({ created_by: userId });
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const body = document.getElementById('hist-body');
  const summaryEl = document.getElementById('hist-summary');
  try {
    const rows = await api.get('/atendimentos?' + params.toString());
    const completed = rows.filter((r) => r.status === 'concluido');
    const totalRevenue = completed.reduce((sum, r) => sum + r.price, 0);
    summaryEl.innerHTML = `
      <div class="stat-tile">
        <div class="label">Atendimentos concluídos</div>
        <div class="value">${completed.length}</div>
      </div>
      <div class="stat-tile">
        <div class="label">Receita gerada no período</div>
        <div class="value">${formatMoney(totalRevenue)}</div>
      </div>
    `;

    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="6" class="empty-msg">Nenhum atendimento no período.</td></tr>';
      return;
    }
    body.innerHTML = rows.map((r) => `
      <tr>
        <td>${formatDate(r.served_at)}</td>
        <td>${r.service_name}</td>
        <td>${r.vehicle_plate || '-'}</td>
        <td>${PAYMENT_LABELS[r.payment_method] || r.payment_method}</td>
        <td><span class="badge ${r.status}">${STATUS_LABELS[r.status] || r.status}</span></td>
        <td class="num">${formatMoney(r.price)}</td>
      </tr>
    `).join('');
  } catch (err) {
    body.innerHTML = `<tr><td colspan="6" class="error-msg">Erro: ${err.message}</td></tr>`;
  }
}
