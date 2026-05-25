/* ═══════════════════════════════════════════════════════════
   partial.js — Conectando Sonhos v7

   Renderiza header e footer dinamicamente em todas as páginas.
   Princípio: DRY — uma única fonte de verdade para navegação,
   logotipo e rodapé. Mudanças se propagam para todo o site.

   Uso: <div data-partial="header"></div>
        <div data-partial="footer"></div>
   ═══════════════════════════════════════════════════════════ */

const NAV_LINKS = [
  { href: 'index.html',   label: 'Início' },
  { href: 'sobre.html',   label: 'Sobre' },
  { href: 'cartas.html',  label: 'Cartinhas' },
  { href: 'impacto.html', label: 'Impacto' },
  { href: 'sonhos.html',  label: 'Realizados' },
];

const PONTOS_COLETA = [
  'R. Alberto de Azevedo, 379',
  'Av. Paulo Pucci, 79',
  'R. Cândido Portinari, 899',
  'R. Augusto dos Anjos, 551',
];

function renderHeader() {
  return `
    <a href="#conteudo" class="skip-link">Pular para o conteúdo</a>
    <header class="site-header" id="site-header" role="banner">
      <a href="index.html" class="logo-link" aria-label="Conectando Sonhos — Página inicial">
        <img src="./logotipo/logotipo.png" alt="" width="36" height="36" decoding="async"/>
        <div>
          <span class="logo-nome">Conectando Sonhos</span>
          <span class="logo-sub">Solidariedade que transforma</span>
        </div>
      </a>
      <nav class="nav-links" id="nav-menu" aria-label="Navegação principal">
        ${NAV_LINKS.map(l => `<a href="${l.href}">${l.label}</a>`).join('')}
      </nav>
      <div id="nav-usuario" class="nav-usuario" aria-label="Área do usuário"></div>
      <button class="hamburger" aria-label="Abrir menu de navegação"
              aria-expanded="false" aria-controls="nav-menu">
        <span></span><span></span><span></span>
      </button>
    </header>`;
}

function renderFooter() {
  return `
    <footer class="site-footer" aria-label="Rodapé">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-marca">
            <div class="logo-link" style="margin-bottom:var(--sp-2)">
              <img src="./logotipo/logotipo.png" alt="" width="34" height="34" decoding="async"/>
              <div>
                <span class="logo-nome">Conectando Sonhos</span>
                <span class="logo-sub">Solidariedade que transforma</span>
              </div>
            </div>
            <p>Iniciativa da FATEC Dr. Thomaz Novelino — Franca/SP. Desenvolvido com amor por estudantes de DSM.</p>
            <nav class="footer-redes" aria-label="Redes sociais">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <i class="bi bi-facebook" aria-hidden="true"></i></a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <i class="bi bi-instagram" aria-hidden="true"></i></a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" aria-label="GitHub do projeto">
                <i class="bi bi-github" aria-hidden="true"></i></a>
            </nav>
          </div>
          <nav class="footer-col" aria-label="Explorar">
            <h4>Explorar</h4>
            ${NAV_LINKS.map(l => `<a href="${l.href}">${l.label}</a>`).join('')}
          </nav>
          <nav class="footer-col" aria-label="Participar">
            <h4>Participar</h4>
            <a href="login.html">Sou doador</a>
            <a href="login.html">Sou instituição</a>
            <a href="login.html">Fazer login</a>
          </nav>
          <address class="footer-col" aria-label="Pontos de coleta">
            <h4>Pontos de Coleta</h4>
            ${PONTOS_COLETA.map(p => `<a href="cartas.html#pontos">${p}</a>`).join('')}
          </address>
        </div>
        <div class="footer-bottom">
          <span>© 2026 Conectando Sonhos · Todos os direitos reservados</span>
          <span>Desenvolvido com ♥ por QuadCore · FATEC Franca</span>
        </div>
      </div>
    </footer>
    <div class="toasts" role="status" aria-live="polite" aria-atomic="false"></div>`;
}

/* Inicialização — substitui placeholders e ativa interações */
function initPartials() {
  document.querySelectorAll('[data-partial="header"]').forEach(el => {
    el.outerHTML = renderHeader();
  });
  document.querySelectorAll('[data-partial="footer"]').forEach(el => {
    el.outerHTML = renderFooter();
  });
  /* initMenu vem de core.js — chama após injeção */
  if (typeof initMenu === 'function') initMenu();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPartials);
} else {
  initPartials();
}
