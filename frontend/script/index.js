// index.js — página inicial
// Carrega KPIs reais, cartinhas disponíveis e atualiza números do hero

document.addEventListener('DOMContentLoaded', async () => {
  // ── KPIs do banco ────────────────────────────────────────────
  try {
    const d = await Dados.impacto();
    animNum(document.getElementById('n-total'), d.total     || 0);
    animNum(document.getElementById('n-adot'),  d.adotadas  || 0);
    animNum(document.getElementById('n-entr'),  d.entregues || 0);
    animNum(document.getElementById('n-doad'),  d.doadores  || 0);

    // "N cartinhas aguardando" no hero
    const credDisp = document.getElementById('n-cred-disp');
    if (credDisp) credDisp.textContent = (d.aguardando || d.total || 0);

    // "N doadores já realizaram sonhos" — parágrafo do hero
    const pDoad = document.getElementById('n-doad-hero');
    if (pDoad) pDoad.textContent = d.doadores || 0;
  } catch(e) {
    console.error('[index] erro ao carregar KPIs:', e);
  }

  await carregarHome();
});

async function carregarHome() {
  const grid = document.getElementById('grid-home');
  const nd   = document.getElementById('n-disp');
  if (!grid) return;
  try {
    const lista  = await Cartinhas.listar({ status: 'disponivel' });
    if (nd) nd.textContent = lista.length;
    const exibir = lista.slice(0, 4);
    if (!exibir.length) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:var(--tinta-claro)">Nenhuma cartinha disponível no momento.</p>';
      return;
    }
    const tons = ['t1','t2','t3','t1'];
    grid.innerHTML = exibir.map((c, i) => cartaCard(c, tons[i % tons.length])).join('');
    initScrollReveal();
  } catch(e) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:var(--tinta-claro)">Erro ao carregar.</p>';
    console.error('[index] erro ao carregar mural:', e);
  }
}

function cartaCard(c, tom = 't1') {
  const idade = calcIdade(c.nascimento);
  const label = PRESENTE[c.presente] || c.presente;
  return `<article class="carta-card entra">
    <div class="cc-topo ${tom}">
      <div class="cc-badge"><span class="badge badge-disp">Disponível</span></div>
      <div class="cc-nome">${c.nome_crianca}</div>
      <div class="cc-meta">${idade} anos · ${c.inst_nome}</div>
    </div>
    <div class="cc-corpo">
      <p class="cc-trecho">"${c.texto}"</p>
      <div class="cc-presente"><i class="bi bi-gift-fill"></i><span>${label}</span></div>
    </div>
    <div class="cc-rodape">
      <button class="btn btn-primario btn-full btn-m" data-id="${c.id}" onclick="adotar(this.dataset.id)">
        <i class="bi bi-heart-fill"></i> Realizar este Sonho
      </button>
    </div>
  </article>`;
}

async function adotar(id) {
  if (!Auth.get()) {
    toast('Faça login para adotar uma cartinha 💙', 'aviso');
    setTimeout(() => location.href = 'login.html', 1800);
    return;
  }
  // Redireciona para o mural onde o doador escolhe o ponto de coleta
  location.href = `cartas.html`;
}

window.adotar   = adotar;
window.cartaCard = cartaCard;