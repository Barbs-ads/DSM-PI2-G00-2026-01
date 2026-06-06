document.addEventListener('DOMContentLoaded', async () => {
  const u = Auth.get();
  if (!u || u.tipo !== 'admin') {
    window.location.href = 'login.html';
    return;
  }
  initMenu();
  initNavegacao();
  initLogout();
  await carregarPainelAtivo();
});

function initNavegacao() {
  const botoes = document.querySelectorAll('.sb-link[data-panel]');
  const paineis = document.querySelectorAll('.dash-panel');
  botoes.forEach(btn => {
    btn.addEventListener('click', async () => {
      botoes.forEach(b => b.classList.remove('ativo'));
      paineis.forEach(p => p.classList.remove('ativo'));
      btn.classList.add('ativo');
      const painel = document.getElementById(`panel-${btn.dataset.panel}`);
      if (painel) painel.classList.add('ativo');
      await carregarPainelAtivo();
    });
  });
}

function initLogout() {
  const logout = document.querySelector('[data-action="logout"]');
  if (logout) logout.addEventListener('click', () => Auth.logout());
}

async function carregarPainelAtivo() {
  const ativo = document.querySelector('.sb-link[data-panel].ativo');
  const panel = ativo?.dataset.panel;
  if (!panel) return;
  switch (panel) {
    case 'visao-geral':   await carregarVisaoGeral(); break;
    case 'instituicoes':  await carregarInstituicoes(); break;
    case 'cartinhas':     await carregarCartinhas(); break;
    case 'doadores':      await carregarDoadores(); break;
    case 'presentes':     await carregarPresentes(); break;
    case 'coleta':        await carregarPontos(); break;
  }
}

async function carregarVisaoGeral() {
  try {
    const data = await api('/impacto');
    const el = id => document.getElementById(id);
    if (el('kpi-total'))     el('kpi-total').textContent     = data.total || 0;
    if (el('kpi-adotadas'))  el('kpi-adotadas').textContent  = data.adotadas || 0;
    if (el('kpi-entregues')) el('kpi-entregues').textContent = data.entregues || 0;
    if (el('kpi-doadores'))  el('kpi-doadores').textContent  = data.doadores || 0;
  } catch (e) { console.error('Erro visão geral:', e); }
}

async function carregarInstituicoes() {
  const cont = document.querySelector('#panel-instituicoes tbody');
  if (!cont) return;
  cont.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
  try {
    const data = await api('/admin/instituicoes');
    const lista = Array.isArray(data) ? data : data.instituicoes || [];
    if (!lista.length) { cont.innerHTML = '<tr><td colspan="4">Nenhuma instituição.</td></tr>'; return; }
    cont.innerHTML = lista.map(inst => `
      <tr>
        <td>${inst.nome || '—'}</td>
        <td><span class="status ${inst.verificada ? 'aprovado' : 'pendente'}">${inst.verificada ? 'Aprovada' : 'Pendente'}</span></td>
        <td>${inst.cidade || '—'}/${inst.uf || '—'}</td>
        <td>
          ${!inst.verificada ? `<button class="btn-icon" onclick="aprovarInstituicao(${inst.id})"><i class="bi bi-check-circle"></i></button>` : ''}
          <button class="btn-icon danger" onclick="removerInstituicao(${inst.id})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('');
  } catch (e) { cont.innerHTML = `<tr><td colspan="4">Erro: ${e.message}</td></tr>`; }
}

async function aprovarInstituicao(id) {
  if (!confirm('Aprovar esta instituição?')) return;
  try {
    await api(`/admin/instituicoes/${id}/aprovar`, { method: 'PATCH' });
    toast('✅ Instituição aprovada!', 'sucesso');
    await carregarInstituicoes();
  } catch (e) { toast('Erro: ' + e.message, 'erro'); }
}

async function removerInstituicao(id) {
  if (!confirm('Remover esta instituição?')) return;
  try {
    await api(`/admin/instituicoes/${id}/desativar`, { method: 'PATCH' });
    toast('Instituição desativada.', 'info');
    await carregarInstituicoes();
  } catch (e) { toast('Erro: ' + e.message, 'erro'); }
}

async function carregarCartinhas() {
  const cont = document.querySelector('#panel-cartinhas tbody');
  if (!cont) return;
  cont.innerHTML = '<tr><td colspan="5">Carregando...</td></tr>';
  try {
    const data = await api('/admin/cartinhas');
    const lista = data.cartinhas || [];
    if (!lista.length) { cont.innerHTML = '<tr><td colspan="5">Nenhuma cartinha.</td></tr>'; return; }
    cont.innerHTML = lista.map(c => `
      <tr>
        <td>${c.crianca_nome || '—'}</td>
        <td>${c.categoria_nome || '—'}</td>
        <td><span class="status ${c.status}">${c.status}</span></td>
        <td>${c.inst_nome || '—'}</td>
        <td>
          ${c.status === 'aguardando' ? `<button class="btn-icon" onclick="aprovarCartinha(${c.id})"><i class="bi bi-check-circle"></i></button>` : ''}
          ${c.status === 'adotada' ? `<button class="btn-icon" onclick="entregarCartinha(${c.id})"><i class="bi bi-gift"></i></button>` : ''}
        </td>
      </tr>`).join('');
  } catch (e) { cont.innerHTML = `<tr><td colspan="5">Erro: ${e.message}</td></tr>`; }
}

async function aprovarCartinha(id) {
  if (!confirm('Aprovar esta cartinha?')) return;
  try {
    await api(`/admin/cartinhas/${id}/aprovar`, { method: 'PATCH' });
    toast('✅ Cartinha aprovada!', 'sucesso');
    await carregarCartinhas();
  } catch (e) { toast('Erro: ' + e.message, 'erro'); }
}

async function entregarCartinha(id) {
  if (!confirm('Marcar como entregue?')) return;
  try {
    await api(`/admin/cartinhas/${id}/entregar`, { method: 'PATCH' });
    toast('🎁 Marcado como entregue!', 'sucesso');
    await carregarCartinhas();
  } catch (e) { toast('Erro: ' + e.message, 'erro'); }
}

async function carregarDoadores() {
  const cont = document.querySelector('#panel-doadores tbody');
  if (!cont) return;
  cont.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
  try {
    const lista = await api('/admin/doadores');
    if (!lista.length) { cont.innerHTML = '<tr><td colspan="4">Nenhum doador.</td></tr>'; return; }
    cont.innerHTML = lista.map(d => `
      <tr>
        <td>${d.nome || '—'}</td>
        <td>${d.email || '—'}</td>
        <td>${d.cidade || '—'}${d.uf ? '/' + d.uf : ''}</td>
        <td>${d.telefone || '—'}</td>
      </tr>`).join('');
  } catch (e) { cont.innerHTML = `<tr><td colspan="4">Erro: ${e.message}</td></tr>`; }
}

async function carregarPresentes() {
  const cont = document.querySelector('#panel-presentes tbody');
  if (!cont) return;
  cont.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
  try {
    const lista = await api('/admin/presentes/avulsos');
    if (!lista.length) { cont.innerHTML = '<tr><td colspan="4">Nenhum presente.</td></tr>'; return; }
    cont.innerHTML = lista.map(p => `
      <tr>
        <td>${p.observacoes || '—'}</td>
        <td><span class="status ${p.status}">${p.status || '—'}</span></td>
        <td>${p.doador_nome || p.doador_email || '—'}</td>
        <td>
          <button class="btn-icon" onclick="atualizarPresente(${p.id})"><i class="bi bi-arrow-repeat"></i></button>
          <button class="btn-icon danger" onclick="removerPresente(${p.id})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('');
  } catch (e) { cont.innerHTML = `<tr><td colspan="4">Erro: ${e.message}</td></tr>`; }
}

async function atualizarPresente(id) {
  const novoStatus = prompt('Novo status (pendente, recebida, redirecionada, cancelada):');
  if (!novoStatus) return;
  try {
    await api(`/admin/presentes/${id}`, { method: 'PATCH', body: JSON.stringify({ status: novoStatus }) });
    toast('✅ Status atualizado!', 'sucesso');
    await carregarPresentes();
  } catch (e) { toast('Erro: ' + e.message, 'erro'); }
}

async function removerPresente(id) {
  if (!confirm('Remover este presente?')) return;
  try {
    await api(`/admin/presentes/${id}`, { method: 'DELETE' });
    toast('Presente removido.', 'info');
    await carregarPresentes();
  } catch (e) { toast('Erro: ' + e.message, 'erro'); }
}

async function carregarPontos() {
  const cont = document.querySelector('#panel-coleta tbody');
  if (!cont) return;
  cont.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
  try {
    const data = await api('/pontos');
    const lista = Array.isArray(data) ? data : data.pontos || [];
    if (!lista.length) { cont.innerHTML = '<tr><td colspan="4">Nenhum ponto.</td></tr>'; return; }
    cont.innerHTML = lista.map(p => `
      <tr>
        <td>${p.nome || '—'}</td>
        <td>${p.responsavel || '—'}</td>
        <td>${p.cidade || '—'}/${p.uf || '—'}</td>
        <td>
          <button class="btn-icon danger" onclick="removerPonto(${p.id})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`).join('');
  } catch (e) { cont.innerHTML = `<tr><td colspan="4">Erro: ${e.message}</td></tr>`; }
}

async function removerPonto(id) {
  if (!confirm('Remover este ponto?')) return;
  try {
    await api(`/admin/pontos/${id}`, { method: 'DELETE' });
    toast('Ponto removido.', 'info');
    await carregarPontos();
  } catch (e) { toast('Erro: ' + e.message, 'erro'); }
}
/* ══ NOVO PONTO — MODAL ════════════════════════════════════ */
function abrirModalNovoPonto() {
  const existe = document.getElementById('modal-novo-ponto');
  if (existe) { existe.style.display = 'flex'; return; }

  const modal = document.createElement('div');
  modal.id = 'modal-novo-ponto';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999';
  modal.innerHTML = `
    <div style="background:white;border-radius:12px;padding:32px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto">
      <h2 style="margin-bottom:24px;font-family:var(--f-display)">Novo Ponto de Coleta</h2>
      <form id="form-novo-ponto">
        <div style="margin-bottom:16px">
          <label style="display:block;margin-bottom:4px;font-weight:600;font-size:.88rem">Nome *</label>
          <input id="np-nome" type="text" class="campo-input" required style="width:100%"/>
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;margin-bottom:4px;font-weight:600;font-size:.88rem">Endereço *</label>
          <input id="np-endereco" type="text" class="campo-input" required style="width:100%"/>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div>
            <label style="display:block;margin-bottom:4px;font-weight:600;font-size:.88rem">Bairro</label>
            <input id="np-bairro" type="text" class="campo-input" style="width:100%"/>
          </div>
          <div>
            <label style="display:block;margin-bottom:4px;font-weight:600;font-size:.88rem">CEP</label>
            <input id="np-cep" type="text" class="campo-input" style="width:100%"/>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 80px;gap:12px;margin-bottom:16px">
          <div>
            <label style="display:block;margin-bottom:4px;font-weight:600;font-size:.88rem">Cidade *</label>
            <input id="np-cidade" type="text" class="campo-input" required style="width:100%"/>
          </div>
          <div>
            <label style="display:block;margin-bottom:4px;font-weight:600;font-size:.88rem">UF *</label>
            <input id="np-uf" type="text" class="campo-input" required maxlength="2" style="width:100%"/>
          </div>
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;margin-bottom:4px;font-weight:600;font-size:.88rem">Responsável</label>
          <input id="np-responsavel" type="text" class="campo-input" style="width:100%"/>
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;margin-bottom:4px;font-weight:600;font-size:.88rem">Telefone</label>
          <input id="np-telefone" type="text" class="campo-input" style="width:100%"/>
        </div>
        <div style="margin-bottom:24px">
          <label style="display:block;margin-bottom:4px;font-weight:600;font-size:.88rem">Horário</label>
          <input id="np-horario" type="text" class="campo-input" placeholder="Ex: Seg–Sex · 9h–17h" style="width:100%"/>
        </div>
        <div style="display:flex;gap:12px">
          <button type="submit" class="btn btn-primario" style="flex:1" id="btn-salvar-ponto">
            <i class="bi bi-plus-lg"></i> Salvar Ponto
          </button>
          <button type="button" class="btn btn-ghost" onclick="fecharModalNovoPonto()">Cancelar</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(modal);

  document.getElementById('form-novo-ponto').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar-ponto');
    btn.innerHTML = '<span class="spinner"></span> Salvando…';
    btn.disabled = true;
    try {
      await api('/admin/pontos', {
        method: 'POST',
        body: JSON.stringify({
          nome:        document.getElementById('np-nome').value,
          endereco:    document.getElementById('np-endereco').value,
          bairro:      document.getElementById('np-bairro').value,
          cep:         document.getElementById('np-cep').value,
          cidade:      document.getElementById('np-cidade').value,
          uf:          document.getElementById('np-uf').value.toUpperCase(),
          responsavel: document.getElementById('np-responsavel').value,
          telefone:    document.getElementById('np-telefone').value,
          horario:     document.getElementById('np-horario').value,
        })
      });
      toast('✅ Ponto criado com sucesso!', 'sucesso');
      fecharModalNovoPonto();
      await carregarPontos();
    } catch (err) {
      toast('Erro ao criar ponto: ' + err.message, 'erro');
    } finally {
      btn.innerHTML = '<i class="bi bi-plus-lg"></i> Salvar Ponto';
      btn.disabled = false;
    }
  });
}

function fecharModalNovoPonto() {
  const modal = document.getElementById('modal-novo-ponto');
  if (modal) modal.style.display = 'none';
}

function abrirModalNovaInstituicao() {
  const existe = document.getElementById('modal-nova-inst');
  if (existe) { existe.style.display = 'flex'; return; }

  const modal = document.createElement('div');
  modal.id = 'modal-nova-inst';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:9999';
  modal.innerHTML = `
    <div style="background:white;border-radius:12px;padding:32px;width:100%;max-width:480px;max-height:90vh;overflow-y:auto">
      <h2 style="margin-bottom:24px;font-family:var(--f-display)">Nova Instituição</h2>
      <form id="form-nova-inst">
        <div style="margin-bottom:16px">
          <label style="display:block;margin-bottom:4px;font-weight:600;font-size:.88rem">Nome *</label>
          <input id="ni-nome" type="text" class="campo-input" required style="width:100%"/>
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;margin-bottom:4px;font-weight:600;font-size:.88rem">CNPJ</label>
          <input id="ni-cnpj" type="text" class="campo-input" style="width:100%"/>
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;margin-bottom:4px;font-weight:600;font-size:.88rem">E-mail</label>
          <input id="ni-email" type="email" class="campo-input" style="width:100%"/>
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;margin-bottom:4px;font-weight:600;font-size:.88rem">Telefone</label>
          <input id="ni-telefone" type="text" class="campo-input" style="width:100%"/>
        </div>
        <div style="display:grid;grid-template-columns:1fr 80px;gap:12px;margin-bottom:16px">
          <div>
            <label style="display:block;margin-bottom:4px;font-weight:600;font-size:.88rem">Cidade *</label>
            <input id="ni-cidade" type="text" class="campo-input" required style="width:100%"/>
          </div>
          <div>
            <label style="display:block;margin-bottom:4px;font-weight:600;font-size:.88rem">UF *</label>
            <input id="ni-uf" type="text" class="campo-input" required maxlength="2" style="width:100%"/>
          </div>
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;margin-bottom:4px;font-weight:600;font-size:.88rem">Endereço</label>
          <input id="ni-endereco" type="text" class="campo-input" style="width:100%"/>
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;margin-bottom:4px;font-weight:600;font-size:.88rem">Responsável</label>
          <input id="ni-responsavel" type="text" class="campo-input" style="width:100%"/>
        </div>
        <div style="margin-bottom:24px">
          <label style="display:block;margin-bottom:4px;font-weight:600;font-size:.88rem">E-mail do Responsável *</label>
          <input id="ni-resp-email" type="email" class="campo-input" required style="width:100%"/>
        </div>
        <div style="display:flex;gap:12px">
          <button type="submit" class="btn btn-primario" style="flex:1" id="btn-salvar-inst">
            <i class="bi bi-plus-lg"></i> Salvar Instituição
          </button>
          <button type="button" class="btn btn-ghost" onclick="fecharModalNovaInstituicao()">Cancelar</button>
        </div>
      </form>
    </div>`;
  document.body.appendChild(modal);

  document.getElementById('form-nova-inst').addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar-inst');
    btn.innerHTML = '<span class="spinner"></span> Salvando…';
    btn.disabled = true;
    try {
      await api('/auth/registrar/instituicao', {
        method: 'POST',
        body: JSON.stringify({
          nome_instituicao:    document.getElementById('ni-nome').value,
          cnpj:                document.getElementById('ni-cnpj').value,
          email_instituicao:   document.getElementById('ni-email').value,
          telefone:            document.getElementById('ni-telefone').value,
          cidade:              document.getElementById('ni-cidade').value,
          uf:                  document.getElementById('ni-uf').value.toUpperCase(),
          endereco:            document.getElementById('ni-endereco').value,
          responsavel_nome:    document.getElementById('ni-responsavel').value,
          responsavel_email:   document.getElementById('ni-resp-email').value,
          senha:               'Senha@123'
        })
      });
      toast('✅ Instituição criada com sucesso!', 'sucesso');
      fecharModalNovaInstituicao();
      await carregarInstituicoes();
    } catch (err) {
      toast('Erro ao criar instituição: ' + err.message, 'erro');
    } finally {
      btn.innerHTML = '<i class="bi bi-plus-lg"></i> Salvar Instituição';
      btn.disabled = false;
    }
  });
}

function fecharModalNovaInstituicao() {
  const modal = document.getElementById('modal-nova-inst');
  if (modal) modal.style.display = 'none';
}

window.aprovarInstituicao = aprovarInstituicao;
window.removerInstituicao = removerInstituicao;
window.aprovarCartinha    = aprovarCartinha;
window.entregarCartinha   = entregarCartinha;
window.atualizarPresente  = atualizarPresente;
window.removerPresente    = removerPresente;
window.removerPonto       = removerPonto;

window.abrirModalNovoPonto  = abrirModalNovoPonto;
window.fecharModalNovoPonto = fecharModalNovoPonto;

window.abrirModalNovaInstituicao  = abrirModalNovaInstituicao;
window.fecharModalNovaInstituicao = fecharModalNovaInstituicao;

