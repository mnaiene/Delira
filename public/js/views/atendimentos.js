let _atServices = [];

async function renderAtendimentosPage(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Atendimentos</h1>
        <p class="subtitle">Carros atendidos no lava-rápido</p>
      </div>
      <button class="btn" style="width:auto" id="new-atendimento-btn">+ Novo atendimento</button>
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
        <label>Status</label>
        <select id="filter-status">
          <option value="">Todos</option>
          <option value="concluido">Concluído</option>
          <option value="em_andamento">Em andamento</option>
          <option value="cancelado">Cancelado</option>
        </select>
      </div>
      <button class="btn secondary" style="width:auto" id="apply-filter-btn">Filtrar</button>
    </div>

    <div class="panel">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Data</th><th>Serviço</th><th>Cliente</th><th>Veículo</th>
              <th>Pagamento</th><th>Status</th><th class="num">Valor</th><th></th>
            </tr>
          </thead>
          <tbody id="atendimentos-body"><tr><td colspan="8">Carregando...</td></tr></tbody>
        </table>
      </div>
    </div>
  `;

  const today = todayISO();
  const monthStart = today.slice(0, 7) + '-01';
  document.getElementById('filter-from').value = monthStart;
  document.getElementById('filter-to').value = today;

  try {
    _atServices = await api.get('/services');
  } catch (e) { /* ignore */ }

  document.getElementById('new-atendimento-btn').addEventListener('click', () => openAtendimentoModal());
  document.getElementById('apply-filter-btn').addEventListener('click', loadAtendimentos);

  await loadAtendimentos();
}

async function loadAtendimentos() {
  const from = document.getElementById('filter-from').value;
  const to = document.getElementById('filter-to').value;
  const status = document.getElementById('filter-status').value;
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (status) params.set('status', status);

  const body = document.getElementById('atendimentos-body');
  try {
    const rows = await api.get('/atendimentos?' + params.toString());
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="8" class="empty-msg">Nenhum atendimento no período.</td></tr>';
      return;
    }
    body.innerHTML = rows.map((r) => `
      <tr>
        <td>${formatDate(r.served_at)}</td>
        <td>${r.service_name}</td>
        <td>${r.customer_name || '-'}</td>
        <td>${r.vehicle_plate || '-'} ${r.vehicle_model ? '(' + r.vehicle_model + ')' : ''}</td>
        <td>${PAYMENT_LABELS[r.payment_method] || r.payment_method}</td>
        <td><span class="badge ${r.status}">${STATUS_LABELS[r.status] || r.status}</span></td>
        <td class="num">${formatBRL(r.price)}</td>
        <td class="row-actions">
          <button data-edit="${r.id}">Editar</button>
          <button data-del="${r.id}" class="danger">Excluir</button>
        </td>
      </tr>
    `).join('');

    body.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = rows.find((r) => r.id === Number(btn.dataset.edit));
        openAtendimentoModal(row);
      });
    });
    body.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Excluir este atendimento?')) return;
        await api.del('/atendimentos/' + btn.dataset.del);
        toast('Atendimento excluído');
        loadAtendimentos();
      });
    });
  } catch (err) {
    body.innerHTML = `<tr><td colspan="8" class="error-msg">Erro: ${err.message}</td></tr>`;
  }
}

function openAtendimentoModal(existing) {
  const isEdit = !!existing;
  const serviceOptions = _atServices.map((s) =>
    `<option value="${s.id}" data-price="${s.price}" ${existing && existing.service_id === s.id ? 'selected' : ''}>${s.name} - ${formatBRL(s.price)}</option>`
  ).join('');

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <h2>${isEdit ? 'Editar atendimento' : 'Novo atendimento'}</h2>
      <form id="atendimento-form">
        <div class="form-grid">
          <div class="field full">
            <label>Serviço</label>
            <select id="f-service">
              <option value="">Selecione / personalizado</option>
              ${serviceOptions}
            </select>
          </div>
          <div class="field full">
            <label>Nome do serviço (se personalizado)</label>
            <input id="f-service-name" value="${existing ? existing.service_name : ''}" />
          </div>
          <div class="field">
            <label>Valor (R$)</label>
            <input id="f-price" type="number" step="0.01" min="0" value="${existing ? existing.price : ''}" required />
          </div>
          <div class="field">
            <label>Data</label>
            <input id="f-date" type="date" value="${existing ? existing.served_at : todayISO()}" required />
          </div>
          <div class="field">
            <label>Cliente</label>
            <input id="f-customer" value="${existing ? (existing.customer_name || '') : ''}" />
          </div>
          <div class="field">
            <label>Placa</label>
            <input id="f-plate" value="${existing ? (existing.vehicle_plate || '') : ''}" />
          </div>
          <div class="field">
            <label>Modelo do veículo</label>
            <input id="f-model" value="${existing ? (existing.vehicle_model || '') : ''}" />
          </div>
          <div class="field">
            <label>Tipo de veículo</label>
            <select id="f-vtype">
              ${Object.entries(VEHICLE_TYPE_LABELS).map(([k, v]) => `<option value="${k}" ${existing && existing.vehicle_type === k ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Pagamento</label>
            <select id="f-payment">
              ${Object.entries(PAYMENT_LABELS).map(([k, v]) => `<option value="${k}" ${existing && existing.payment_method === k ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>Status</label>
            <select id="f-status">
              ${Object.entries(STATUS_LABELS).map(([k, v]) => `<option value="${k}" ${existing && existing.status === k ? 'selected' : (!existing && k === 'concluido' ? 'selected' : '')}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="field full">
            <label>Observações</label>
            <input id="f-notes" value="${existing ? (existing.notes || '') : ''}" />
          </div>
        </div>
        <p class="error-msg" id="atendimento-error"></p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" id="cancel-modal">Cancelar</button>
          <button type="submit" class="btn">${isEdit ? 'Salvar' : 'Registrar'}</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(backdrop);

  const serviceSelect = backdrop.querySelector('#f-service');
  serviceSelect.addEventListener('change', () => {
    const opt = serviceSelect.selectedOptions[0];
    if (opt && opt.dataset.price) {
      backdrop.querySelector('#f-price').value = opt.dataset.price;
      backdrop.querySelector('#f-service-name').value = opt.textContent.split(' - ')[0];
    }
  });

  backdrop.querySelector('#cancel-modal').addEventListener('click', () => backdrop.remove());
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });

  backdrop.querySelector('#atendimento-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const serviceId = serviceSelect.value ? Number(serviceSelect.value) : null;
    const serviceNameInput = backdrop.querySelector('#f-service-name').value.trim();
    const payload = {
      service_id: serviceId,
      service_name: serviceNameInput || (serviceSelect.selectedOptions[0] ? serviceSelect.selectedOptions[0].textContent.split(' - ')[0] : ''),
      price: Number(backdrop.querySelector('#f-price').value),
      served_at: backdrop.querySelector('#f-date').value,
      customer_name: backdrop.querySelector('#f-customer').value.trim() || null,
      vehicle_plate: backdrop.querySelector('#f-plate').value.trim() || null,
      vehicle_model: backdrop.querySelector('#f-model').value.trim() || null,
      vehicle_type: backdrop.querySelector('#f-vtype').value,
      payment_method: backdrop.querySelector('#f-payment').value,
      status: backdrop.querySelector('#f-status').value,
      notes: backdrop.querySelector('#f-notes').value.trim() || null,
    };
    if (!payload.service_name) {
      backdrop.querySelector('#atendimento-error').textContent = 'Escolha um serviço ou informe um nome.';
      return;
    }
    try {
      if (isEdit) {
        await api.put('/atendimentos/' + existing.id, payload);
        toast('Atendimento atualizado');
      } else {
        await api.post('/atendimentos', payload);
        toast('Atendimento registrado');
      }
      backdrop.remove();
      loadAtendimentos();
    } catch (err) {
      backdrop.querySelector('#atendimento-error').textContent = err.message;
    }
  });
}
