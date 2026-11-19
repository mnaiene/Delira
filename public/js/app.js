const PAGES = {
  dashboard: { label: 'Dashboard', render: renderDashboardPage },
  atendimentos: { label: 'Atendimentos', render: renderAtendimentosPage },
  despesas: { label: 'Despesas', render: renderDespesasPage },
  servicos: { label: 'Serviços', render: renderServicosPage },
};

let currentUser = null;

async function init() {
  try {
    currentUser = await api.get('/auth/me');
    showApp();
  } catch (e) {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app-shell').classList.add('hidden');
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-shell').classList.remove('hidden');
  document.getElementById('sidebar-user').textContent = currentUser.name;
  navigate('dashboard');
}

function navigate(page) {
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });
  const main = document.getElementById('main-content');
  PAGES[page].render(main);
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  errorEl.textContent = '';
  try {
    currentUser = await api.post('/auth/login', { email, password });
    showApp();
  } catch (err) {
    errorEl.textContent = err.message;
  }
});

document.querySelectorAll('.nav-item[data-page]').forEach((btn) => {
  btn.addEventListener('click', () => navigate(btn.dataset.page));
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await api.post('/auth/logout');
  currentUser = null;
  showLogin();
});

document.getElementById('change-password-btn').addEventListener('click', () => {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <h2>Trocar senha</h2>
      <form id="pw-form">
        <div class="field">
          <label>Senha atual</label>
          <input id="pw-current" type="password" required />
        </div>
        <div class="field">
          <label>Nova senha</label>
          <input id="pw-new" type="password" required minlength="6" />
        </div>
        <p class="error-msg" id="pw-error"></p>
        <div class="modal-actions">
          <button type="button" class="btn secondary" id="pw-cancel">Cancelar</button>
          <button type="submit" class="btn">Salvar</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(backdrop);
  backdrop.querySelector('#pw-cancel').addEventListener('click', () => backdrop.remove());
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) backdrop.remove(); });
  backdrop.querySelector('#pw-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/change-password', {
        currentPassword: backdrop.querySelector('#pw-current').value,
        newPassword: backdrop.querySelector('#pw-new').value,
      });
      toast('Senha alterada com sucesso');
      backdrop.remove();
    } catch (err) {
      backdrop.querySelector('#pw-error').textContent = err.message;
    }
  });
});

init();
