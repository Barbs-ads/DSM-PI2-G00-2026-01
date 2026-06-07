/* impacto.js — Conectando Sonhos v7
   Todos os números, faixas e donut carregam dados reais da API.
   Fallback para zeros se a API não responder. */

document.addEventListener('DOMContentLoaded', async () => {

  /* ── Data de sincronização ──────────────────────────────── */
  const upd = document.getElementById('imp-update');
  if (upd) {
    const agora = new Date();
    upd.dateTime = agora.toISOString();
    upd.textContent = agora.toLocaleString('pt-BR', {
      day:'2-digit', month:'2-digit', year:'numeric',
      hour:'2-digit', minute:'2-digit',
    });
  }

  /* ── 1. Busca KPIs ──────────────────────────────────────── */
  let kpis = { total:0, adotadas:0, entregues:0, doadores:0,
               instituicoes:0, pontos_coleta:0, aguardando:0 };
  try {
    kpis = await Dados.impacto();
  } catch(e) {
    console.warn('[impacto] KPIs indisponíveis:', e.message);
  }

  const adotadas = Number(kpis.adotadas)  || 0;
  const entregues= Number(kpis.entregues) || 0;
  const emRota   = Math.max(adotadas - entregues, 0);
  const faltam   = Math.max((Number(kpis.total)||0) - adotadas, 0);

  /* ── 2. Hero: número grande e faixas ────────────────────── */
  const bnGrande = document.getElementById('bn-grande');
  if (bnGrande) {
    bnGrande.dataset.target = adotadas;
    animNum(bnGrande, adotadas);
  }
  const faixas = document.querySelectorAll('.ihbnf-item strong');
  if (faixas[0]) faixas[0].textContent = entregues.toLocaleString('pt-BR');
  if (faixas[1]) faixas[1].textContent = emRota.toLocaleString('pt-BR');

  /* ── 3. CTA urgência ─────────────────────────────────────── */
  const cta = document.getElementById('cta-f');
  if (cta) cta.textContent = faltam.toLocaleString('pt-BR');

  /* ── 4. Animação de todos os [data-target] ───────────────── */
  // Atualiza data-target dos elementos que correspondem aos KPIs
  const kpiMap = {
    'kpi-total':     kpis.total,
    'kpi-adotadas':  kpis.adotadas,
    'kpi-entregues': kpis.entregues,
    'kpi-doadores':  kpis.doadores,
  };
  Object.entries(kpiMap).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && val != null) el.dataset.target = val;
  });

  const animObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting || e.target.dataset.animated) return;
      e.target.dataset.animated = '1';
      animNum(e.target, parseInt(e.target.dataset.target, 10) || 0);
    });
  }, { threshold: 0.4 });
  document.querySelectorAll('[data-target]').forEach(el => animObs.observe(el));

  /* ── 5. Donut: busca distribuição real ───────────────────── */
  try {
    const dist = await apiGet('/distribuicao');
    if (Array.isArray(dist) && dist.length) {
      renderDonut(dist, adotadas);
    } else {
      // sem dados mas atualiza o número central
      atualizarNumCentral(adotadas);
    }
  } catch(e) {
    console.warn('[impacto] distribuição indisponível:', e.message);
    atualizarNumCentral(adotadas);
  }
});

/* ── Atualiza só o número central do donut ──────────────────── */
function atualizarNumCentral(valor) {
  const el = document.querySelector('.donut-num');
  if (el) el.textContent = valor.toLocaleString('pt-BR');
}

/* ── Renderiza donut e legenda com dados reais ──────────────── */
function renderDonut(dist, totalAdotadas) {
  // Agrupa categorias por grupo (brinquedos, escola, roupas, esportes, outros)
  const grupos = {};
  dist.forEach(item => {
    const g = item.grupo || 'outros';
    if (!grupos[g]) grupos[g] = { quantidade: 0 };
    grupos[g].quantidade += Number(item.quantidade) || 0;
  });

  const ordemGrupos = ['brinquedos', 'escola', 'roupas', 'esportes', 'outros'];
  const total = totalAdotadas || ordemGrupos.reduce((s,g) => s + (grupos[g]?.quantidade||0), 0);

  // Número central
  atualizarNumCentral(total);

  // Texto descritivo
  const distDesc = document.querySelector('.dist-desc');
  if (distDesc) {
    distDesc.innerHTML = `Distribuição dos <strong>${total.toLocaleString('pt-BR')}</strong> sonhos realizados em 2026 por categoria de presente. Cada fatia é uma necessidade real expressa por uma criança.`;
  }

  /* ── Fatias SVG ─────────────────────────────────────────────
     Cada fatia usa transform="rotate(-90 100 100)" definido no HTML.
     stroke-dasharray: [tamanho_fatia] [restante_da_circunferência]
     stroke-dashoffset: negativo do acumulado anterior (sentido horário)
     Circunferência com r=78: 2×π×78 ≈ 490.09
  */
  const CIRC = 2 * Math.PI * 78; // 490.09

  let acumulado = 0;
  ordemGrupos.forEach((grupo, i) => {
    const fatia = document.querySelector(`.donut-fatia.f${i + 1}`);
    if (!fatia) return;

    const qtd  = grupos[grupo]?.quantidade || 0;
    const frac = total > 0 ? qtd / total : 0;
    const dash = frac * CIRC;
    const gap  = CIRC - dash;

    fatia.setAttribute('stroke-dasharray',  `${dash.toFixed(2)} ${gap.toFixed(2)}`);
    fatia.setAttribute('stroke-dashoffset', `${(-acumulado).toFixed(2)}`);
    // Mantém o transform que já existe no HTML (rotate(-90 100 100))
    acumulado += dash;
  });

  /* ── Legenda ──────────────────────────────────────────────── */
  const legendaItems = document.querySelectorAll('.dl-item');
  ordemGrupos.forEach((grupo, i) => {
    const item = legendaItems[i];
    if (!item) return;
    const qtd = grupos[grupo]?.quantidade || 0;
    const pct = total > 0 ? Math.round(qtd / total * 100) : 0;
    const pctEl = item.querySelector('.dl-pct');
    const absEl = item.querySelector('.dl-abs');
    if (pctEl) pctEl.textContent = `${pct}%`;
    if (absEl) absEl.textContent = `${qtd} entregas`;
  });
}