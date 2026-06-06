// dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
  const u = Auth.get();
  if (!u) { location.href = 'login.html'; return; }

  const sbNome = document.getElementById('sb-nome');
  const sbAv   = document.getElementById('sb-av');
  if (sbNome) sbNome.textContent = u.nome;
  if (sbAv)   sbAv.textContent   = u.nome.charAt(0).toUpperCase();

  document.querySelectorAll('.sb-link[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sb-link').forEach(b => {
        b.classList.remove('ativo');
        b.removeAttribute('aria-current');
      });
      document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('ativo'));
      btn.classList.add('ativo');
      btn.setAttribute('aria-current', 'page');
      document.getElementById(`panel-${btn.dataset.panel}`)?.classList.add('ativo');
    });
  });

  document.querySelectorAll('[data-action="logout"]').forEach(btn => {
    btn.addEventListener('click', () => Auth.logout());
  });

  await carregarCartinhas(u);
  initFormNova(u);

  if (u.tipo === 'instituicao') {
    await carregarPerfilInstituicao(u);
    initFormPerfil(u);
  }
});

async function carregarCartinhas(u) {
  const lista = document.getElementById('lista-d');
  const badge = document.getElementById('badge-tot');
  if (!lista) return;

  let minhasCartinhas = [];

  if (u.tipo === 'instituicao') {
    const todasCartinhas = await Cartinhas.listar({});
    minhasCartinhas = todasCartinhas.filter(c => c.inst_id === u.inst_id);
  } else {
    // Doador busca só as suas adoções
    try {
      const data = await api(`/cartinhas/doador/minhas?_t=${Date.now()}`);
      minhasCartinhas = data.cartinhas || [];
    } catch (e) {
      minhasCartinhas = [];
    }
  }

  const exibir = minhasCartinhas.slice(0, 10);
  if (badge) badge.textContent = exibir.length;

  const rAdot = document.getElementById('r-adot');
  const rEntr = document.getElementById('r-entr');
  if (rAdot) rAdot.textContent = minhasCartinhas.filter(c => c.status === 'adotada').length;
  if (rEntr) rEntr.textContent = minhasCartinhas.filter(c => c.status === 'entregue').length;

  if (!exibir.length) {
    const msg = u.tipo === 'instituicao'
      ? 'Sua instituição ainda não cadastrou nenhuma cartinha.'
      : 'Você ainda não adotou nenhuma cartinha.';
    lista.innerHTML = `
      <div class="lista-vazia">
        <i class="bi bi-envelope-open" aria-hidden="true"></i>
        <p>${msg}</p>
      </div>`;
    return;
  }

  const badges = {
    disponivel: '<span class="badge badge-disp">Disponível no Mural</span>',
    adotada:    '<span class="badge badge-adotada">Em andamento</span>',
    entregue:   '<span class="badge badge-entregue">Entregue</span>',
    aguardando: '<span class="badge badge-aguard">Em análise</span>',
  };

  window.cartinhasAtuais = exibir;

  lista.innerHTML = exibir.map(c => {
    const idade = calcIdade(c.nascimento || c.crianca_data_nasc);
    const label = PRESENTE[c.presente || c.categoria_slug] || c.categoria_nome || c.presente;

    let botoesAcao = `
      <button type="button" class="btn btn-ghost btn-p ms-2" onclick="abrirModal('${c.id}')" title="Ler carta completa">
        <i class="bi bi-eye-fill"></i>
      </button>`;

    if (u.tipo === 'instituicao') {
      if (c.status === 'aguardando' || c.status === 'disponivel') {
        botoesAcao += `
          <button type="button" class="btn btn-outline btn-p ms-1" style="color:#fc8181;border-color:#fc8181;" onclick="excluirCartinha('${c.id}')" title="Excluir cartinha">
            <i class="bi bi-trash3-fill"></i>
          </button>`;
      }
    } else {
      if (c.status === 'adotada') {
        botoesAcao += `
          <button type="button" class="btn btn-outline btn-p ms-1" style="color:#fc8181;border-color:#fc8181;" onclick="desistirCartinha('${c.id}')" title="Desistir da adoção">
            <i class="bi bi-x-circle-fill"></i>
          </button>`;
      }
    }

    return `
      <div class="item-d">
        <div class="id-icon"><i class="bi bi-envelope-heart-fill"></i></div>
        <div style="flex:1">
          <div class="id-nome">${c.nome_crianca || c.crianca_nome || '—'}</div>
          <div class="id-meta">${idade} anos · ${label}</div>
          <div class="id-trecho">"${c.texto.slice(0, 90)}…"</div>
        </div>
        <div class="id-acoes d-flex align-items-center">
          ${badges[c.status] || ''}
          ${botoesAcao}
        </div>
      </div>`;
  }).join('');
}

function initFormNova(u) {
  const form = document.getElementById('form-nova');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const texto = document.getElementById('fn-txt').value;
    if (texto.length < 20) {
      toast('O texto deve ter no mínimo 20 caracteres.', 'erro');
      return;
    }
    const btn = document.getElementById('btn-nova');
    btn.innerHTML = '<span class="spinner"></span> Enviando…';
    btn.disabled = true;
    try {
      await Cartinhas.criar({
        nome:       document.getElementById('fn-nome').value,
        nascimento: document.getElementById('fn-nasc').value,
        presente:   document.getElementById('fn-pres').value,
        texto,
      });
      toast('✅ Cartinha enviada para análise!', 'sucesso');
      form.reset();
      document.querySelector('[data-panel="cartinhas"]').click();
      await carregarCartinhas(u);
    } catch (err) {
      toast('Erro ao enviar cartinha: ' + err.message, 'erro');
    } finally {
      btn.innerHTML = '<i class="bi bi-send-fill"></i> Enviar para Análise';
      btn.disabled = false;
    }
  });
}

async function carregarPerfilInstituicao(u) {
  try {
    if (!u.inst_id) return;
    const data = await api(`/instituicoes/${u.inst_id}`);
    if (!data) return;
    const el = id => document.getElementById(id);
    if (el('p-nome-inst')) el('p-nome-inst').value = data.nome     || '';
    if (el('p-cnpj'))      el('p-cnpj').value      = data.cnpj     || '';
    if (el('p-email-inst'))el('p-email-inst').value = data.email    || '';
    if (el('p-tel-inst'))  el('p-tel-inst').value   = data.telefone || '';
    if (el('p-cidade'))    el('p-cidade').value     = data.cidade   || '';
    if (el('p-uf'))        el('p-uf').value         = data.uf       || '';
    if (el('p-endereco'))  el('p-endereco').value   = data.endereco || '';
  } catch (e) {
    console.error('Erro ao carregar perfil:', e);
  }
}

function initFormPerfil(u) {
  document.getElementById('form-perfil')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('btn-perfil');
    btn.innerHTML = '<span class="spinner"></span> Salvando…';
    btn.disabled = true;
    try {
      const el = id => document.getElementById(id)?.value;
      await api(`/instituicoes/${u.inst_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          nome:     el('p-nome-inst'),
          cnpj:     el('p-cnpj'),
          email:    el('p-email-inst'),
          telefone: el('p-tel-inst'),
          cidade:   el('p-cidade'),
          uf:       el('p-uf'),
          endereco: el('p-endereco')
        })
      });
      toast('✅ Dados salvos com sucesso!', 'sucesso');
    } catch (err) {
      toast('Erro ao salvar: ' + err.message, 'erro');
    } finally {
      btn.innerHTML = '<i class="bi bi-floppy-fill"></i> Salvar alterações';
      btn.disabled = false;
    }
  });
}

window.abrirModal = (id) => {
  const modal    = document.getElementById('modal-leitura');
  const cartinha = window.cartinhasAtuais?.find(c => c.id == id);
  if (cartinha && modal) {
    document.getElementById('modal-tit').textContent = `Carta de ${cartinha.nome_crianca || cartinha.crianca_nome || '—'}`;
    document.getElementById('modal-tag').textContent = PRESENTE[cartinha.presente] || PRESENTE[cartinha.categoria_slug] || cartinha.categoria_nome || '—';
    document.getElementById('modal-txt').textContent = `"${cartinha.texto}"`;
    modal.showModal();
  }
};

window.fecharModal = () => {
  document.getElementById('modal-leitura')?.close();
};

window.desistirCartinha = async (id) => {
  if (!confirm('Tem certeza que deseja cancelar o apadrinhamento desta cartinha?')) return;
  try {
    await api(`/cartinhas/${id}/cancelar`, { method: 'PATCH' });
    toast('Adoção cancelada. A cartinha voltou para o mural.', 'aviso');
    await carregarCartinhas(Auth.get());
  } catch (error) {
    toast('Erro ao cancelar. Tente novamente.', 'erro');
  }
};

window.excluirCartinha = async (id) => {
  if (!confirm('Tem certeza que deseja apagar esta cartinha? Esta ação não pode ser desfeita.')) return;
  try {
    await api(`/cartinhas/${id}`, { method: 'DELETE' });
    toast('Cartinha excluída com sucesso.', 'sucesso');
    await carregarCartinhas(Auth.get());
  } catch (error) {
    toast('Erro ao excluir cartinha.', 'erro');
  }
};