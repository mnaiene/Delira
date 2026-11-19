async function renderUsuariosPage(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1>Usuários</h1>
        <p class="subtitle">Funcionários com acesso ao sistema</p>
      </div>
      <button class="btn" style="width:auto" id="new-user-btn">+ Novo usuário</button>
    </div>
    <div class="panel">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th></th></tr></thead>
          <tbody id="usuarios-body"><tr><td colspan="5">Carregando...</td></tr></tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('new-user-btn').addEventListener('click', () => openUsuarioModal());
  await loadUsuarios();
}

const ROLE_LABELS = { admin: 'Administrador', funcionario: 'Funcionário' };

async function loadUsuarios() {
  const body = document.getElementById('usuarios-body');
  try {
    const rows = await api.get('/users');
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="5" class="empty-msg">Nenhum usuário cadastrado.</td></tr>';
      return;
    }
    body.innerHTML = rows.map((u) => `
      <tr>
        <td>${u.name}${u.id === currentUser.id ? ' (você)' : ''}</td>
        <td>${u.email}</td>
        <td>${ROLE_LABELS[u.role] || u.role}</td>
        <td><span class="badge ${u.active ? 'concluido' : 'cancelado'}">${u.active ? 'Ativo' : 'Inativo'}</span></td>
        <td class="row-actions">
          <button data-edit="${u.id}">Editar</button>
          ${u.id === currentUser.id ? '' : `<button data-toggle="${u.id}" data-active="${u.active}" class="danger">${u.active ? 'Desativar' : 'Reativar'}</button>`}
        </td>
      </tr>
    `).join('');

    body.querySelectorAll('[data-edit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = rows.find((u) => u.id === Number(btn.dataset.edit));
        openUsuarioModal(row);
      });
    });
    body.querySelectorAll('[data-toggle]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const willActivate = btn.dataset.active === '0';
        if (!willActivate && !confirm('Desativar este usuário? Ele não poderá mais entrar no sistema.')) return;
        await api.put('/users/' + btn.dataset.toggle, { active: willActivate });
        toast(willActivate ? 'Usuário reativado' : 'Usuário desativado');
        loadUsuarios();
      });
    });
  } catch (err) {
    body.innerHTML = `<tr><td colspan="5" class="error-msg">Erro: ${err.message}</td></tr>`;
  }
}

function openUsuarioModal(existing) {
  const isEdit = !!existing;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <h2>${isEdit ? 'Editar usuário' : 'Novo usuário'}</h2>
      <form id="usuario-form">
        <div class="field">
          <label>Nome</label>
          <input id="f-name" value="${existing ? existing.name : ''}" required />
        </div>
        ${isEdit ? '' : `
        <div class="field">
          <label>E-mail</label>
          <input id="f-email" type="email" required />
        </div>`}
        <div class="field">
          <label>${isEdit ? 'Nova senha (deixe em branco para manter)' : 'Senha'}</label>
          <input id="f-password" type="password" minlength="6" ${isEdit ? '' : 'required'} />
        </div>
        <div class="field">
          <label>Perfil</label>
          <select id="f-role">
            <option value="funcionario" ${existing && existing.role === 'funcionario' ? 'selected' : ''}>Funcionário</option>
            <option value="admin" ${existing && existing.role === 'admin' ? 'selected' : ''}>Administrador</option>
          </select>
        </div>
        <p class="error-msg" id="usuario-error"></p>
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

  backdrop.querySelector('#usuario-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = backdrop.querySelector('#f-password').value;
    try {
      if (isEdit) {
        const payload = {
          name: backdrop.querySelector('#f-name').value.trim(),
          role: backdrop.querySelector('#f-role').value,
        };
        if (password) payload.password = password;
        await api.put('/users/' + existing.id, payload);
        toast('Usuário atualizado');
      } else {
        await api.post('/users', {
          name: backdrop.querySelector('#f-name').value.trim(),
          email: backdrop.querySelector('#f-email').value.trim(),
          password,
          role: backdrop.querySelector('#f-role').value,
        });
        toast('Usuário criado');
      }
      backdrop.remove();
      loadUsuarios();
    } catch (err) {
      backdrop.querySelector('#usuario-error').textContent = err.message;
    }
  });
}
