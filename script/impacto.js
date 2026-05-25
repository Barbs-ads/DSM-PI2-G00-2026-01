/* ═══════════════════════════════════════════════════════════
   impacto.js — Conectando Sonhos v7
   Anima KPIs, donut, contadores e atualiza tela com dados reais
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {
  /* Atualização "última sincronização" */
  const upd = document.getElementById('imp-update');
  if (upd) {
    const agora = new Date();
    upd.dateTime = agora.toISOString();
    upd.textContent = agora.toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  /* Anima qualquer elemento com data-target quando entra em viewport */
  const animObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting || e.target.dataset.animated) return;
      e.target.dataset.animated = '1';
      animNum(e.target, parseInt(e.target.dataset.target, 10));
    });
  }, { threshold: 0.4 });

  document.querySelectorAll('[data-target]').forEach(el => animObs.observe(el));

  /* Carrega KPIs reais (sobrescreve mocks) e ajusta CTA de urgência */
  try {
    const d = await Dados.impacto();
    const faltam = Math.max(d.total - d.adotadas, 0);
    const cta = document.getElementById('cta-f');
    if (cta) cta.textContent = faltam;
  } catch (e) {
    console.warn('[impacto] usando valores estáticos do HTML', e);
  }
});
