// TODO BACKEND:
// Os dados abaixo estão estáticos apenas para prototipação visual.
// Futuramente deverão ser carregados dinamicamente via API/Node.js/PostgreSQL.
const botoes = document.querySelectorAll('.sb-link[data-panel]');
const paineis = document.querySelectorAll('.dash-panel');

botoes.forEach(btn => {

  btn.addEventListener('click', () => {

    botoes.forEach(b => b.classList.remove('ativo'));
    paineis.forEach(p => p.classList.remove('ativo'));

    btn.classList.add('ativo');

    const painel = document.getElementById(`panel-${btn.dataset.panel}`);

    if (painel) {
      painel.classList.add('ativo');
    }

  });

});
const logout = document.querySelector('[data-action="logout"]');

if (logout) {
  logout.addEventListener('click', () => {

    localStorage.removeItem('usuario');

    window.location.href = 'login.html';

  });
}
