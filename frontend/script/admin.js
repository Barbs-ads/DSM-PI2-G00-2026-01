/* admin.js — Conectando Sonhos v7
   Painel administrativo totalmente integrado à API. */

document.addEventListener('DOMContentLoaded', async () => {
  const u = Auth.get();

  if (!u || u.tipo !== 'admin') {
    location.href = 'login.html';
    return;
  }

  const sbNome = document.getElementById('sb-nome');
  const sbAv   = document.getElementById('sb-av');
  if (sbNome) sbNome.textContent = u.nome || 'Admin';
  if (sbAv)   sbAv.textContent   = (u.nome || 'A').charAt(0).toUpperCase();

  document.querySelectorAll('.sb-link[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sb-link').forEach(b => b.classList.remove('ativo'));
      document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('ativo'));
      btn.classList.add('ativo');
      const painel = document.getElementById(`panel-${btn.dataset.panel}`);
      if (painel) painel.classList.add('ativo');

      const panel = btn.dataset.panel;
      if (panel === 'instituicoes') carregarInstituicoes();
      else if (panel === 'cartinhas') carregarCartinhasAdmin();
      else if (panel === 'doadores')  carregarDoadores();
      else if (panel === 'presentes') carregarPresentes();
      else if (panel === 'coleta')    carregarPontos();
    });
  });

  document.querySelectorAll('[data-action="logout"]').forEach(btn => {
    btn.addEventListener('click', () => Auth.logout());
  });

  await carregarVisaoGeral();
});

/* ══ VISÃO GERAL ═════════════════════════════════════════════ */
async function carregarVisaoGeral() {
  try {
    const kpis = await apiGet('/impacto');
    const cards = document.querySelectorAll('.card-admin div strong');
    const vals  = [
      kpis.instituicoes || 0,
      kpis.total        || 0,
      kpis.adotadas     || 0,
      kpis.doadores     || 0,
    ];
    cards.forEach((el, i) => { if (vals[i] != null) el.textContent = vals[i]; });
  } catch(e) {
    console.error('[admin] visão geral:', e.message);
  }
}

/* ══ INSTITUIÇÕES ═══════════════════════════════════════════ */
async function carregarInstituicoes() {
  const tbody = document.querySelector('#panel-instituicoes tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px">Carregando…</td></tr>';
  try {
    const u = Auth.get();
    const lista = await apiGet('/admin/instituicoes', u.token);
    if (!lista.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px">Nenhuma instituição cadastrada.</td></tr>';
      return;
    }
    tbody.innerHTML = lista.map(inst => `
      <tr>
        <td>
          <strong>${inst.nome}</strong>
          <br><small style="color:var(--tinta-claro)">${inst.tipo || '—'}</small>
        </td>
        <td>
          <span class="status ${inst.verificada ? 'aprovado' : 'pendente'}">
            ${inst.verificada ? 'Aprovada' : 'Pendente'}
          </span>
          ${!inst.ativa ? '<span class="status inativo" style="margin-left:4px">Inativa</span>' : ''}
        </td>
        <td>${inst.cidade || '—'}/${inst.uf || '—'}</td>
        <td style="display:flex;gap:4px;align-items:center">
          <button class="btn-icon" title="Visualizar" onclick="verInstituicao(${inst.id})">
            <i class="bi bi-eye"></i>
          </button>
          <button class="btn-icon" title="Editar" onclick="editarInstituicao(${inst.id})">
            <i class="bi bi-pencil"></i>
          </button>
          ${!inst.verificada ? `
          <button class="btn-icon" title="Aprovar" onclick="aprovarInstituicao(${inst.id})">
            <i class="bi bi-check-circle"></i>
          </button>` : ''}
          ${inst.ativa ? `
          <button class="btn-icon danger" title="Desativar" onclick="desativarInstituicao(${inst.id}, '${inst.nome.replace(/'/g,"\\'")}')">
            <i class="bi bi-trash"></i>
          </button>` : ''}
        </td>
      </tr>`).join('');

    // Guarda a lista em memória para o modal de edição/visualização
    window._instituicoes = lista;
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="4" style="color:red;padding:20px">Erro: ${e.message}</td></tr>`;
  }
}

window.aprovarInstituicao = async (id) => {
  if (!confirm('Aprovar esta instituição?')) return;
  try {
    const u = Auth.get();
    await apiPost(`/admin/instituicoes/${id}/aprovar`, {}, u.token, 'PATCH');
    toast('✅ Instituição aprovada!', 'sucesso');
    await carregarInstituicoes();
  } catch(e) {
    toast(`Erro: ${e.message}`, 'erro');
  }
};

window.verInstituicao = (id) => {
  const inst = (window._instituicoes || []).find(i => i.id === id);
  if (!inst) return;

  document.getElementById('modal-inst')?.remove();
  const modal = document.createElement('dialog');
  modal.id = 'modal-inst';
  modal.style.cssText = 'padding:2rem;border-radius:12px;border:none;width:min(540px,95vw);background:var(--fundo,#fff);color:var(--tinta,#1a1a1a)';

  const linha = (label, val) => val
    ? `<div style="display:flex;gap:.5rem;margin-bottom:.5rem"><strong style="min-width:160px;font-size:.85rem">${label}:</strong><span style="font-size:.85rem">${val}</span></div>`
    : '';

  modal.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem">
      <h2 style="margin:0">${inst.nome}</h2>
      <button onclick="document.getElementById('modal-inst').close()"
        style="background:none;border:none;font-size:1.5rem;cursor:pointer;line-height:1">×</button>
    </div>
    <div style="background:var(--fundo-alt,#f8f7f4);border-radius:8px;padding:1rem;margin-bottom:1rem">
      ${linha('Tipo', inst.tipo)}
      ${linha('CNPJ', inst.cnpj)}
      ${linha('Email', inst.email)}
      ${linha('Telefone', inst.telefone)}
      ${linha('Endereço', inst.endereco ? inst.endereco + (inst.bairro ? ', ' + inst.bairro : '') : null)}
      ${linha('Cidade/UF', inst.cidade ? inst.cidade + '/' + inst.uf : null)}
      ${linha('Status', inst.verificada ? '✅ Aprovada' : '⏳ Aguardando aprovação')}
    </div>
    <div style="background:var(--fundo-alt,#f8f7f4);border-radius:8px;padding:1rem;margin-bottom:1rem">
      <strong style="font-size:.85rem;display:block;margin-bottom:.5rem">Responsável</strong>
      ${linha('Nome', inst.responsavel_nome)}
      ${linha('Email', inst.responsavel_email)}
      ${linha('Telefone', inst.responsavel_telefone)}
    </div>
    ${inst.observacoes ? `<p style="font-size:.85rem;color:var(--tinta-claro)"><strong>Obs:</strong> ${inst.observacoes}</p>` : ''}
    <div style="display:flex;justify-content:flex-end;gap:.5rem;margin-top:1rem">
      ${!inst.verificada ? `<button onclick="aprovarInstituicao(${inst.id});document.getElementById('modal-inst').close()"
        style="padding:.5rem 1.25rem;background:var(--terracota,#c0531a);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">
        ✅ Aprovar
      </button>` : ''}
      <button onclick="document.getElementById('modal-inst').close()"
        style="padding:.5rem 1.25rem;border:1.5px solid #d1d5db;background:transparent;border-radius:8px;cursor:pointer">
        Fechar
      </button>
    </div>`;

  document.body.appendChild(modal);
  modal.showModal();
};

window.editarInstituicao = (id) => {
  const inst = (window._instituicoes || []).find(i => i.id === id);
  if (!inst) return;
  _abrirModalInstituicao(inst);
};

window.desativarInstituicao = async (id, nome) => {
  if (!confirm(`Desativar a instituição "${nome}"? Ela deixará de aparecer no sistema.`)) return;
  try {
    const u = Auth.get();
    await apiPost(`/admin/instituicoes/${id}`, {}, u.token, 'DELETE');
    toast('Instituição desativada.', 'aviso');
    await carregarInstituicoes();
  } catch(e) {
    toast(`Erro: ${e.message}`, 'erro');
  }
};

window.abrirModalNovaInstituicao = () => {
  _abrirModalInstituicao(null);
};

function _abrirModalInstituicao(inst) {
  document.getElementById('modal-inst-form')?.remove();

  const modal = document.createElement('dialog');
  modal.id = 'modal-inst-form';
  modal.style.cssText = 'padding:2rem;border-radius:12px;border:none;width:min(560px,95vw);max-height:90vh;overflow-y:auto;background:var(--fundo,#fff);color:var(--tinta,#1a1a1a)';

  const v = (campo) => inst?.[campo] || '';
  const input = (name, label, req, val, type='text') => `
    <label style="display:flex;flex-direction:column;gap:.25rem;font-size:.85rem;font-weight:600">
      ${label}${req ? ' *' : ''}
      <input name="${name}" type="${type}" ${req ? 'required' : ''} value="${val}"
        style="padding:.45rem .75rem;border:1.5px solid #d1d5db;border-radius:8px;font-size:.95rem">
    </label>`;

  modal.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem">
      <h2 style="margin:0">${inst ? 'Editar Instituição' : 'Nova Instituição'}</h2>
      <button type="button" onclick="document.getElementById('modal-inst-form').close()"
        style="background:none;border:none;font-size:1.5rem;cursor:pointer;line-height:1">×</button>
    </div>
    <form id="form-inst" style="display:flex;flex-direction:column;gap:.85rem">

      <p style="margin:0;font-size:.8rem;color:var(--tinta-claro);font-weight:600;text-transform:uppercase;letter-spacing:.05em">Dados da instituição</p>

      ${input('nome',  'Nome da instituição', true,  v('nome'))}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
        <label style="display:flex;flex-direction:column;gap:.25rem;font-size:.85rem;font-weight:600">
          Tipo *
          <select name="tipo" required style="padding:.45rem .75rem;border:1.5px solid #d1d5db;border-radius:8px;font-size:.95rem">
            ${['ong','abrigo','projeto-social','escola','igreja','outro'].map(t =>
              `<option value="${t}" ${v('tipo')===t?'selected':''}>${t}</option>`).join('')}
          </select>
        </label>
        ${input('cnpj', 'CNPJ', false, v('cnpj'))}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
        ${input('email',    'Email da instituição', true,  v('email'), 'email')}
        ${input('telefone', 'Telefone',             false, v('telefone'))}
      </div>

      ${input('endereco', 'Endereço', false, v('endereco'))}

      <div style="display:grid;grid-template-columns:1fr 1fr 80px;gap:.75rem">
        ${input('bairro', 'Bairro', false, v('bairro'))}
        ${input('cidade', 'Cidade', false, v('cidade') || 'Franca')}
        ${input('uf',     'UF',     false, v('uf') || 'SP')}
      </div>

      <p style="margin:.25rem 0 0;font-size:.8rem;color:var(--tinta-claro);font-weight:600;text-transform:uppercase;letter-spacing:.05em">Responsável</p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
        ${input('responsavel_nome',  'Nome do responsável',  false, v('responsavel_nome'))}
        ${input('responsavel_email', 'Email do responsável', false, v('responsavel_email'), 'email')}
      </div>
      ${input('responsavel_telefone', 'Telefone do responsável', false, v('responsavel_telefone'))}

      <label style="display:flex;gap:.5rem;align-items:center;font-size:.875rem;font-weight:600;cursor:pointer">
        <input type="checkbox" name="verificada" value="true" ${v('verificada')===true||v('verificada')==='true'?'checked':''}
          style="width:16px;height:16px">
        Marcar como aprovada imediatamente
      </label>

      <label style="display:flex;flex-direction:column;gap:.25rem;font-size:.85rem;font-weight:600">
        Observações
        <textarea name="observacoes" rows="2"
          style="padding:.45rem .75rem;border:1.5px solid #d1d5db;border-radius:8px;font-size:.95rem;resize:vertical">${v('observacoes')}</textarea>
      </label>

      <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:.5rem">
        <button type="button" onclick="document.getElementById('modal-inst-form').close()"
          style="padding:.5rem 1.25rem;border:1.5px solid #d1d5db;background:transparent;border-radius:8px;cursor:pointer">
          Cancelar
        </button>
        <button type="submit" id="btn-salvar-inst"
          style="padding:.5rem 1.5rem;background:var(--terracota,#c0531a);color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600">
          ${inst ? 'Salvar alterações' : 'Cadastrar'}
        </button>
      </div>
    </form>`;

  document.body.appendChild(modal);
  modal.showModal();

  document.getElementById('form-inst').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar-inst');
    btn.disabled = true;
    btn.textContent = 'Salvando…';

    const fd = new FormData(e.target);
    const dados = Object.fromEntries(fd.entries());
    // checkbox não enviado quando desmarcado
    dados.verificada = fd.has('verificada');

    try {
      const u = Auth.get();
      if (inst) {
        await apiPost(`/admin/instituicoes/${inst.id}`, dados, u.token, 'PUT');
        toast('✅ Instituição atualizada!', 'sucesso');
      } else {
        await apiPost('/admin/instituicoes', dados, u.token, 'POST');
        toast('✅ Instituição cadastrada!', 'sucesso');
      }
      modal.close();
      modal.remove();
      await carregarInstituicoes();
    } catch(err) {
      toast(`Erro: ${err.message}`, 'erro');
      btn.disabled = false;
      btn.textContent = inst ? 'Salvar alterações' : 'Cadastrar';
    }
  });
}

/* ══ CARTINHAS (admin vê todas, inclusive aguardando) ════════ */
async function carregarCartinhasAdmin() {
  const tbody = document.querySelector('#panel-cartinhas tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px">Carregando…</td></tr>';
  try {
    const u = Auth.get();
    // Usa a rota /admin/cartinhas que acessa a tabela direta com token admin
    const lista = await apiGet('/admin/cartinhas', u.token);
    const cartinhas = lista.cartinhas || [];
    if (!cartinhas.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px">Nenhuma cartinha cadastrada.</td></tr>';
      return;
    }
    const statusLabel = { disponivel:'Disponível', adotada:'Adotada',
                          entregue:'Entregue', aguardando:'Pendente', cancelada:'Cancelada' };
    const statusClass = { disponivel:'aprovado', adotada:'reservado',
                          entregue:'aprovado', aguardando:'pendente', cancelada:'inativo' };
    tbody.innerHTML = cartinhas.map(c => `
      <tr>
        <td>${c.crianca_nome || '—'} · ${c.crianca_idade != null ? c.crianca_idade + ' anos' : '?'}</td>
        <td>${c.categoria_nome || c.categoria_slug || '—'}</td>
        <td><span class="status ${statusClass[c.status] || ''}">${statusLabel[c.status] || c.status}</span></td>
        <td>${c.inst_nome || '—'}</td>
        <td>
          ${c.status === 'aguardando' ? `<button class="btn-icon" title="Aprovar" onclick="aprovarCartinha(${c.id})"><i class="bi bi-check-circle"></i></button>` : ''}
          ${c.status === 'adotada'    ? `<button class="btn-icon" title="Marcar entregue" onclick="marcarEntregue(${c.id})"><i class="bi bi-gift"></i></button>` : ''}
          ${c.status !== 'cancelada' && c.status !== 'entregue' ? `<button class="btn-icon danger" title="Cancelar" onclick="cancelarCartinha(${c.id})"><i class="bi bi-trash"></i></button>` : ''}
        </td>
      </tr>`).join('');
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="5" style="color:red;padding:20px">Erro: ${e.message}</td></tr>`;
  }
}

window.aprovarCartinha = async (id) => {
  if (!confirm('Aprovar e publicar esta cartinha no mural?')) return;
  try {
    const u = Auth.get();
    await apiPost(`/admin/cartinhas/${id}/aprovar`, {}, u.token, 'PATCH');
    toast('✅ Cartinha aprovada e publicada!', 'sucesso');
    await carregarCartinhasAdmin();
  } catch(e) { toast(`Erro: ${e.message}`, 'erro'); }
};

window.marcarEntregue = async (id) => {
  if (!confirm('Confirmar entrega desta cartinha?')) return;
  try {
    const u = Auth.get();
    await apiPost(`/admin/cartinhas/${id}/entregar`, {}, u.token, 'PATCH');
    toast('✅ Presente marcado como entregue!', 'sucesso');
    await carregarCartinhasAdmin();
  } catch(e) { toast(`Erro: ${e.message}`, 'erro'); }
};

window.cancelarCartinha = async (id) => {
  const motivo = prompt('Motivo do cancelamento:');
  if (!motivo) return;
  try {
    const u = Auth.get();
    await apiPost(`/admin/cartinhas/${id}/cancelar`, { motivo }, u.token, 'PATCH');
    toast('Cartinha cancelada.', 'aviso');
    await carregarCartinhasAdmin();
  } catch(e) { toast(`Erro: ${e.message}`, 'erro'); }
};

/* ══ DOADORES (dinâmico — busca da API) ════════════════════ */
async function carregarDoadores() {
  const tbody = document.querySelector('#panel-doadores tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px">Carregando…</td></tr>';
  try {
    const u = Auth.get();
    const lista = await apiGet('/admin/doadores', u.token);
    if (!lista.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px">Nenhum doador cadastrado.</td></tr>';
      return;
    }
    tbody.innerHTML = lista.map(d => `
      <tr>
        <td>${d.nome}</td>
        <td>${d.email}</td>
        <td>${d.adocoes}</td>
        <td>
          <button class="btn-icon danger" title="Desativar doador" onclick="desativarDoador(${d.id}, '${d.nome}')">
            <i class="bi bi-person-x"></i>
          </button>
        </td>
      </tr>`).join('');
  } catch(e) {
    // Tenta extrair o detalhe real da resposta da API
    let msg = e.message || 'Erro desconhecido';
    tbody.innerHTML = `<tr><td colspan="4" style="color:red;padding:20px">
      <strong>Erro ao carregar doadores:</strong><br>
      <code style="font-size:.8rem">${msg}</code><br>
      <small>Verifique o console do servidor para mais detalhes.</small>
    </td></tr>`;
    console.error('[admin] doadores:', e);
  }
}

window.desativarDoador = (id, nome) => {
  toast(`Funcionalidade de desativar doador em desenvolvimento.`, 'aviso');
};

/* ══ PRESENTES AVULSOS ══════════════════════════════════════ */
async function carregarPresentes() {
  const tbody = document.querySelector('#panel-presentes tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px">Carregando…</td></tr>';
  try {
    const u    = Auth.get();
    const lista = await apiGet('/admin/presentes/avulsos', u.token);
    if (!lista.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px">Nenhuma doação avulsa registrada.</td></tr>';
      return;
    }
    tbody.innerHTML = lista.map(p => `
      <tr>
        <td>${p.observacoes || 'Doação avulsa'}</td>
        <td><span class="status ${p.status === 'recebida' ? 'aprovado' : 'pendente'}">${p.status}</span></td>
        <td>${p.doador_nome || p.doador_email || '—'}</td>
        <td><button class="btn-icon" title="Ver detalhes"><i class="bi bi-eye"></i></button></td>
      </tr>`).join('');
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="4" style="color:red;padding:20px">Erro: ${e.message}</td></tr>`;
  }
}

/* ══ PONTOS DE COLETA (com criar/editar/excluir) ═══════════ */
async function carregarPontos() {
  const tbody = document.querySelector('#panel-coleta tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px">Carregando…</td></tr>';
  try {
    const lista = await apiGet('/pontos');
    if (!lista.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:20px">Nenhum ponto cadastrado.</td></tr>';
      return;
    }
    tbody.innerHTML = lista.map(p => `
      <tr>
        <td>${p.nome}<br><small style="color:var(--tinta-claro)">${p.endereco}, ${p.bairro}</small></td>
        <td>${p.responsavel || '—'}</td>
        <td>${p.cidade}/${p.uf}</td>
        <td>
          <button class="btn-icon" title="Editar" onclick="abrirModalEditarPonto(${JSON.stringify(p).replace(/"/g, '&quot;')})">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn-icon danger" title="Desativar" onclick="desativarPonto(${p.id}, '${p.nome.replace(/'/g,"\\'")}')">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>`).join('');
  } catch(e) {
    tbody.innerHTML = `<tr><td colspan="4" style="color:red;padding:20px">Erro: ${e.message}</td></tr>`;
  }
}

/* Abre modal para criar novo ponto */
window.abrirModalNovoPonto = () => {
  _abrirModalPonto(null);
};

/* Abre modal para editar ponto existente */
window.abrirModalEditarPonto = (ponto) => {
  _abrirModalPonto(ponto);
};

function _abrirModalPonto(ponto) {
  // Remove modal antigo se existir
  document.getElementById('modal-ponto')?.remove();

  const modal = document.createElement('dialog');
  modal.id = 'modal-ponto';
  modal.style.cssText = 'padding:2rem;border-radius:12px;border:none;width:min(480px,95vw);background:var(--fundo,#fff);color:var(--tinta,#1a1a1a)';
  modal.innerHTML = `
    <form id="form-ponto" style="display:flex;flex-direction:column;gap:1rem">
      <h2 style="margin:0 0 .5rem">${ponto ? 'Editar Ponto' : 'Novo Ponto de Coleta'}</h2>

      <label style="display:flex;flex-direction:column;gap:.25rem;font-size:.875rem;font-weight:600">
        Nome *
        <input name="nome" required value="${ponto?.nome || ''}"
          style="padding:.5rem .75rem;border:1.5px solid #d1d5db;border-radius:8px;font-size:1rem">
      </label>

      <label style="display:flex;flex-direction:column;gap:.25rem;font-size:.875rem;font-weight:600">
        Endereço *
        <input name="endereco" required value="${ponto?.endereco || ''}"
          style="padding:.5rem .75rem;border:1.5px solid #d1d5db;border-radius:8px;font-size:1rem">
      </label>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
        <label style="display:flex;flex-direction:column;gap:.25rem;font-size:.875rem;font-weight:600">
          Bairro *
          <input name="bairro" required value="${ponto?.bairro || ''}"
            style="padding:.5rem .75rem;border:1.5px solid #d1d5db;border-radius:8px;font-size:1rem">
        </label>
        <label style="display:flex;flex-direction:column;gap:.25rem;font-size:.875rem;font-weight:600">
          Cidade *
          <input name="cidade" required value="${ponto?.cidade || 'Franca'}"
            style="padding:.5rem .75rem;border:1.5px solid #d1d5db;border-radius:8px;font-size:1rem">
        </label>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
        <label style="display:flex;flex-direction:column;gap:.25rem;font-size:.875rem;font-weight:600">
          UF *
          <input name="uf" required maxlength="2" value="${ponto?.uf || 'SP'}"
            style="padding:.5rem .75rem;border:1.5px solid #d1d5db;border-radius:8px;font-size:1rem;text-transform:uppercase">
        </label>
        <label style="display:flex;flex-direction:column;gap:.25rem;font-size:.875rem;font-weight:600">
          Telefone
          <input name="telefone" value="${ponto?.telefone || ''}"
            style="padding:.5rem .75rem;border:1.5px solid #d1d5db;border-radius:8px;font-size:1rem">
        </label>
      </div>

      <label style="display:flex;flex-direction:column;gap:.25rem;font-size:.875rem;font-weight:600">
        Responsável
        <input name="responsavel" value="${ponto?.responsavel || ''}"
          style="padding:.5rem .75rem;border:1.5px solid #d1d5db;border-radius:8px;font-size:1rem">
      </label>

      <label style="display:flex;flex-direction:column;gap:.25rem;font-size:.875rem;font-weight:600">
        Horário de funcionamento
        <input name="horario" value="${ponto?.horario || ''}" placeholder="Ex: Seg–Sex 9h–18h"
          style="padding:.5rem .75rem;border:1.5px solid #d1d5db;border-radius:8px;font-size:1rem">
      </label>

      <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:.5rem">
        <button type="button" onclick="document.getElementById('modal-ponto').close()"
          style="padding:.5rem 1.25rem;border:1.5px solid #d1d5db;background:transparent;border-radius:8px;cursor:pointer;font-size:.9rem">
          Cancelar
        </button>
        <button type="submit" id="btn-salvar-ponto"
          style="padding:.5rem 1.5rem;background:var(--terracota,#c0531a);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:.9rem;font-weight:600">
          ${ponto ? 'Salvar alterações' : 'Cadastrar ponto'}
        </button>
      </div>
    </form>`;

  document.body.appendChild(modal);
  modal.showModal();

  document.getElementById('form-ponto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-salvar-ponto');
    btn.disabled = true;
    btn.textContent = 'Salvando…';

    const fd = new FormData(e.target);
    const dados = Object.fromEntries(fd.entries());
    dados.uf = dados.uf.toUpperCase().slice(0, 2);

    try {
      const u = Auth.get();
      if (ponto) {
        await apiPost(`/admin/pontos/${ponto.id}`, dados, u.token, 'PUT');
        toast('✅ Ponto atualizado!', 'sucesso');
      } else {
        await apiPost('/admin/pontos', dados, u.token, 'POST');
        toast('✅ Ponto cadastrado!', 'sucesso');
      }
      modal.close();
      modal.remove();
      await carregarPontos();
    } catch(err) {
      toast(`Erro: ${err.message}`, 'erro');
      btn.disabled = false;
      btn.textContent = ponto ? 'Salvar alterações' : 'Cadastrar ponto';
    }
  });
}

window.desativarPonto = async (id, nome) => {
  if (!confirm(`Desativar o ponto "${nome}"? Ele não aparecerá mais para os doadores.`)) return;
  try {
    const u = Auth.get();
    await apiPost(`/admin/pontos/${id}`, {}, u.token, 'DELETE');
    toast('Ponto desativado.', 'aviso');
    await carregarPontos();
  } catch(e) {
    toast(`Erro: ${e.message}`, 'erro');
  }
};