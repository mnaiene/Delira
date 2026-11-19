async function renderDespesasPage(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Despesas</h1>
        <p class="subtitle">Gastos do lava-rápido</p>
      </div>
      <button class="btn" style="width:auto" id="new-despesa-btn">+ Nova despesa</button>
    </div>

    <div class="toolbar">
      <div class="field">
        <label>De</label>
        <input type="date" id="filter-from" />
      </div>
      <div class="field">
        <label>Até</label>
        <input type="date" id="filter-to" />
      </div>
      <div class="field">
        <label>Categoria</label>
        <select id="filter-category">
          <option value="">Todas</option>
          ${Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}
        </select>
      </div>
      <button class="btn secondary" style="width:auto" id="apply-filter-btn">Filtrar</button>
    </div>

    <div class="panel">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Data</th><th>Descrição</th><th>Categoria</th><th class="num">Valor</th><th></th></tr></thead>
          <tbody id="despesas-body"><tr><td colspan="5">Carregando...</td></tr></tbody>
        </table>
      </div>
    </div>
  `;

  const today = todayISO();
  const monthStart = today.slice(0, 7) + '-01';
  document.getElementById('filter-from').value = monthStart;
  document.getElementById('filter-to').value = today;

  document.getElementById('new-despesa-btn').addEventListener('click', () => openDespesaModal());
  document.getElementById('apply-filter-btn').addEventListener('click', loadDespesas);

  await loadDespesas();
}

async function loadDespesas() {
  const from = document.getElementById('filter-from').value;
  const to = document.getElementById('filter-to').value;
  const category = document.getElementById('filter-category').value;
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (category) params.set('category', category);

  const body = document.getElementById('despesas-body');
  try {
    const rows = await api.get('/despesas?' + params.toString());
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="5" class="empty-msg">Nenhuma despesa no período.</td></tr>';
      return;
    }
    const total = rows.reduce((sum, r) => sum + r.amount, 0);
    body.innerHTML = rows.map((r) => `
      <tr>
        <td>${formatDate(r.expense_date)}</td>
        <td>${r.description}</td>
        <td>${EXPENSE_CATEGORY_LABELS[r.category] || r.category}</td>
        <td class="num">${formatBRL(r.amount)}</td>
        <td class="row-actions">
          <button data-edit="${r.id}">Editar</button>
          <button data-del="${r.id}" class="danger">Excluir</button>
        </td>
      </tr>
    `).join('') + `
      <tr><td colspan="3" style="font-weight:600">Total</td><td class="num" style="font-weight:600">${formatBRL(total)}</td><td></td></tr>
    `;

    body.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = rows.find((r) => r.id === Number(btn.dataset.edit));
        openDespesaModal(row);
      });
    });
    body.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Excluir esta despesa?')) return;
        await api.del('/despesas/' + btn.dataset.del);
        toast('Despesa excluída');
        loadDespesas();
      });
    });
  } catch (err) {
    body.innerHTML = `<tr><td colspan="5" class="error-msg">Erro: ${err.message}</td></tr>`;
  }
}

function openDespesaModal(existing) {
  const isEdit = !!existing;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <h2>${isEdit ? 'Editar despesa' : 'Nova despesa'}</h2>
      <form id="despesa-form">
        <div class="field">
          <label>Descrição</label>
          <input id="f-desc" value="${existing ? existing.description : ''}" required />
        </div>
        <div class="form-grid">
          <div class="field">
            <label>Valor (R$)</label>
            <input id="f-amount" type="number" step="0.01" min="0" value="${existing ? existing.amount : ''}" required />
          </div>
          <div class="field">
            <label>Data</label>
            <input id="f-date" type="date" value="${existing ? existing.expense_date : todayISO()}" required />
          </div>
          <div class="field full">
            <label>Categoria</label>
            <select id="f-category">
              ${Object.entries(EXPENSE_CATEGORY_LABELS).map(([k, v]) => `<option value="${k}" ${existing && existing.category === k ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>
        </div>
        <p class="error-msg" id="despesa-error"></p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" id="cancel-modal">Cancelar</button>
          <button type="submit" class="btn">${isEdit ? 'Salvar' : 'Registrar'}</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(backdrop);
  backdrop.querySelector('#cancel-modal').addEventListener('click', () => backdrop.remove());
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });

  backdrop.querySelector('#despesa-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      description: backdrop.querySelector('#f-desc').value.trim(),
      amount: Number(backdrop.querySelector('#f-amount').value),
      expense_date: backdrop.querySelector('#f-date').value,
      category: backdrop.querySelector('#f-category').value,
    };
    try {
      if (isEdit) {
        await api.put('/despesas/' + existing.id, payload);
        toast('Despesa atualizada');
      } else {
        await api.post('/despesas', payload);
        toast('Despesa registrada');
      }
      backdrop.remove();
      loadDespesas();
    } catch (err) {
      backdrop.querySelector('#despesa-error').textContent = err.message;
    }
  });
}
