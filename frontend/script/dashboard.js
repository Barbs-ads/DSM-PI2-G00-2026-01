// dashboard.js
document.addEventListener('DOMContentLoaded', async () => {
  const u = Auth.get();
  if (!u) { location.href = 'login.html'; return; }

  /* Sidebar — nome e avatar */
  const sbNome = document.getElementById('sb-nome');
  const sbAv   = document.getElementById('sb-av');
  if (sbNome) sbNome.textContent = u.nome;
  if (sbAv)   sbAv.textContent   = u.nome.charAt(0).toUpperCase();

  /* Perfil (doador) */
  const pNome  = document.getElementById('p-nome');
  const pEmail = document.getElementById('p-email');
  if (pNome)  pNome.value  = u.nome;
  if (pEmail) pEmail.value = u.email;

  /* Navegação por painéis */
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

  /* Logout via data-action (substitui onclick inline) */
  document.querySelectorAll('[data-action="logout"]').forEach(btn => {
    btn.addEventListener('click', () => Auth.logout());
  });

  /* Salvar perfil (placeholder até backend) */
  document.getElementById('form-perfil')?.addEventListener('submit', e => {
    e.preventDefault();
    toast('Disponível após integração com Supabase.', 'aviso');
  });

  await carregarCartinhas(u);
  initFormNova(u);
});

async function carregarCartinhas(u) {
  const lista = document.getElementById('lista-d');
  const badge = document.getElementById('badge-tot');
  if (!lista) return;

  // Busca todas as cartinhas
  const todasCartinhas = await Cartinhas.listar({});
  let minhasCartinhas = [];

  // 1. SEPARAÇÃO DE LÓGICA: Quem está logado?
  if (u.tipo === 'instituicao') {
    // A instituição vê todas as cartinhas que ELA cadastrou (todos os status)
    // Na API real será algo como: filter(c => c.inst_id === u.id)
    minhasCartinhas = todasCartinhas; 
  } else {
    // O doador vê APENAS as que ele adotou ou já foram entregues
    minhasCartinhas = todasCartinhas.filter(c => c.status === 'adotada' || c.status === 'entregue');
  }

  const exibir = minhasCartinhas.slice(0, 10);
  if (badge) badge.textContent = exibir.length;

  // Resumo apenas para o doador (se as divs existirem na tela)
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
    const idade = calcIdade(c.nascimento);
    const label = PRESENTE[c.presente] || c.presente;
    
    // Botão de Visualizar é padrão para ambos
    let botoesAcao = `
      <button type="button" class="btn btn-ghost btn-p ms-2" onclick="abrirModal('${c.id}')" title="Ler carta completa">
        <i class="bi bi-eye-fill"></i>
      </button>
    `;
    
    // 2. LÓGICA DE BOTÕES ESPECÍFICOS
    if (u.tipo === 'instituicao') {
        // Se for instituição e o presente ainda não tem padrinho, ela pode EXCLUIR
        if(c.status === 'aguardando' || c.status === 'disponivel') {
            botoesAcao += `
              <button type="button" class="btn btn-outline btn-p ms-1" style="color: #fc8181; border-color: #fc8181;" onclick="excluirCartinha('${c.id}')" title="Excluir cartinha">
                <i class="bi bi-trash3-fill"></i>
              </button>
            `;
        }
    } else {
        // Se for doador e ele ainda não entregou, ele pode DESISTIR
        if(c.status === 'adotada') {
            botoesAcao += `
              <button type="button" class="btn btn-outline btn-p ms-1" style="color: #fc8181; border-color: #fc8181;" onclick="desistirCartinha('${c.id}')" title="Desistir da adoção">
                <i class="bi bi-x-circle-fill"></i>
              </button>
            `;
        }
    }

    return `
      <div class="item-d">
        <div class="id-icon"><i class="bi bi-envelope-heart-fill"></i></div>
        <div style="flex:1">
          <div class="id-nome">${c.nome_crianca}</div>
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
    const btn = document.getElementById('btn-nova');
    btn.innerHTML = '<span class="spinner"></span> Enviando…'; btn.disabled = true;
    try {
      await Cartinhas.criar({
        nome: document.getElementById('fn-nome').value,
        nascimento: document.getElementById('fn-nasc').value,
        presente: document.getElementById('fn-pres').value,
        texto: document.getElementById('fn-txt').value,
      });
      form.reset();
      document.querySelector('[data-panel="cartinhas"]').click();
      await carregarCartinhas(u);
    } catch(err) { toast('Erro ao enviar cartinha.', 'erro'); }
    finally { btn.innerHTML = '<i class="bi bi-send-fill"></i> Enviar para Análise'; btn.disabled = false; }
  });
}

// Abre a janelinha com o texto completo
window.abrirModal = (id) => {
  const modal = document.getElementById('modal-leitura');
  // Procura a cartinha na lista que salvamos antes
  const cartinha = window.cartinhasAtuais.find(c => c.id === id); 
  
  if(cartinha && modal) {
    document.getElementById('modal-tit').textContent = `Carta de ${cartinha.nome_crianca}`;
    document.getElementById('modal-tag').textContent = PRESENTE[cartinha.presente] || cartinha.presente;
    document.getElementById('modal-txt').textContent = `"${cartinha.texto}"`;
    modal.showModal();
  }
};

// Fecha o modal
window.fecharModal = () => {
  const modal = document.getElementById('modal-leitura');
  if(modal) modal.close();
};

// Lógica para desistir do pedido
window.desistirCartinha = async (id) => {
  const confirmacao = confirm("Tem certeza que deseja cancelar o apadrinhamento desta cartinha? Ela voltará para o mural público.");
  
  if(confirmacao) {
    try {
      // Aqui simulamos a chamada para a API
      if (typeof DEMO !== 'undefined' && DEMO) {
        // Encontra no mock global e atualiza o status
        const index = _MOCK.findIndex(c => c.id === id);
        if(index !== -1) _MOCK[index].status = 'disponivel';
      } else {
        // Futura integração real com seu Node.js via fetch POST
        // await api.post('/cartinhas/desistir', { cartinhaId: id });
      }

      toast("Adoção cancelada. A cartinha voltou para o mural.", "aviso");
      
      // Recarrega a tela para sumir da lista
      const u = Auth.get();
      await carregarCartinhas(u);
      
    } catch (error) {
      toast("Erro ao cancelar. Tente novamente.", "erro");
    }
  }
};

// Lógica para a Instituição EXCLUIR uma cartinha
window.excluirCartinha = async (id) => {
  const confirmacao = confirm("Tem certeza que deseja apagar esta cartinha do sistema? Esta ação não pode ser desfeita.");
  
  if(confirmacao) {
    try {
      if (typeof DEMO !== 'undefined' && DEMO) {
        // Remove do Mock global
        const index = _MOCK.findIndex(c => c.id === id);
        if(index !== -1) _MOCK.splice(index, 1);
      } else {
        // Futura API: await api.post('/cartinhas/excluir', { cartinhaId: id });
      }

      toast("Cartinha excluída com sucesso.", "sucesso");
      const u = Auth.get();
      await carregarCartinhas(u);
      
    } catch (error) {
      toast("Erro ao excluir cartinha.", "erro");
    }
  }
};