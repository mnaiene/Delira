async function renderServicosPage(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Serviços</h1>
        <p class="subtitle">Catálogo de serviços e preços do lava-rápido</p>
      </div>
      <button class="btn" style="width:auto" id="new-servico-btn">+ Novo serviço</button>
    </div>
    <div class="panel">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th class="num">Preço</th><th>Status</th><th></th></tr></thead>
          <tbody id="servicos-body"><tr><td colspan="4">Carregando...</td></tr></tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('new-servico-btn').addEventListener('click', () => openServicoModal());
  await loadServicos();
}

async function loadServicos() {
  const body = document.getElementById('servicos-body');
  try {
    const rows = await api.get('/services?all=1');
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="4" class="empty-msg">Nenhum serviço cadastrado.</td></tr>';
      return;
    }
    body.innerHTML = rows.map((r) => `
      <tr>
        <td>${r.name}</td>
        <td class="num">${formatMoney(r.price)}</td>
        <td><span class="badge ${r.active ? 'concluido' : 'cancelado'}">${r.active ? 'Ativo' : 'Inativo'}</span></td>
        <td class="row-actions">
          <button data-edit="${r.id}">Editar</button>
          <button data-del="${r.id}" class="danger">${r.active ? 'Desativar/Excluir' : 'Excluir'}</button>
        </td>
      </tr>
    `).join('');

    body.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = rows.find((r) => r.id === Number(btn.dataset.edit));
        openServicoModal(row);
      });
    });
    body.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Remover este serviço? Se já tiver atendimentos registrados, ele será apenas desativado.')) return;
        await api.del('/services/' + btn.dataset.del);
        toast('Serviço atualizado');
        loadServicos();
      });
    });
  } catch (err) {
    body.innerHTML = `<tr><td colspan="4" class="error-msg">Erro: ${err.message}</td></tr>`;
  }
}

function openServicoModal(existing) {
  const isEdit = !!existing;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <h2>${isEdit ? 'Editar serviço' : 'Novo serviço'}</h2>
      <form id="servico-form">
        <div class="field">
          <label>Nome</label>
          <input id="f-name" value="${existing ? existing.name : ''}" required />
        </div>
        <div class="field">
          <label>Preço (MT)</label>
          <input id="f-price" type="number" step="0.01" min="0" value="${existing ? existing.price : ''}" required />
        </div>
        ${isEdit ? `
        <div class="field">
          <label><input type="checkbox" id="f-active" ${existing.active ? 'checked' : ''} style="width:auto;margin-right:6px" />Ativo</label>
        </div>` : ''}
        <p class="error-msg" id="servico-error"></p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" id="cancel-modal">Cancelar</button>
          <button type="submit" class="btn">${isEdit ? 'Salvar' : 'Criar'}</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(backdrop);
  backdrop.querySelector('#cancel-modal').addEventListener('click', () => backdrop.remove());
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });

  backdrop.querySelector('#servico-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: backdrop.querySelector('#f-name').value.trim(),
      price: Number(backdrop.querySelector('#f-price').value),
    };
    if (isEdit) payload.active = backdrop.querySelector('#f-active').checked;
    try {
      if (isEdit) {
        await api.put('/services/' + existing.id, payload);
        toast('Serviço atualizado');
      } else {
        await api.post('/services', payload);
        toast('Serviço criado');
      }
      backdrop.remove();
      loadServicos();
    } catch (err) {
      backdrop.querySelector('#servico-error').textContent = err.message;
    }
  });
}
