document.addEventListener('DOMContentLoaded', async () => {
  try {
    const d = await Dados.impacto();
    animNum(document.getElementById('n-total'), d.total);
    animNum(document.getElementById('n-adot'),  d.adotadas);
    animNum(document.getElementById('n-entr'),  d.entregues);
    animNum(document.getElementById('n-doad'),  d.doadores);
  } catch(e) { console.error(e); }
  await carregarHome();
});
async function carregarHome() {
  const grid=document.getElementById('grid-home'), nd=document.getElementById('n-disp');
  if(!grid)return;
  try {
    const lista=await Cartinhas.listar({status:'disponivel'});
    if(nd)nd.textContent=lista.length;
    const exibir=lista.slice(0,4);
    if(!exibir.length){grid.innerHTML='<p style="grid-column:1/-1;text-align:center;padding:40px;color:var(--tinta-claro)">Nenhuma cartinha disponível no momento.</p>';return;}
    const tons=['t1','t2','t3','t1'];
    grid.innerHTML=exibir.map((c,i)=>cartaCard(c,tons[i%tons.length])).join('');
    initScrollReveal();
  } catch(e){grid.innerHTML='<p style="grid-column:1/-1;text-align:center;padding:40px;color:var(--tinta-claro)">Erro ao carregar.</p>';}
}
function cartaCard(c, tom='t1') {
  const idade=calcIdade(c.nascimento), label=PRESENTE[c.presente]||c.presente;
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
      <button class="btn btn-primario btn-full btn-m" onclick="adotar('${c.id}')">
        <i class="bi bi-heart-fill"></i> Realizar este Sonho
      </button>
    </div>
  </article>`;
}
async function adotar(id) {
  if(!Auth.get()){toast('Faça login para adotar uma cartinha 💙','aviso');setTimeout(()=>location.href='login.html',1800);return;}
  await Cartinhas.adotar(id);
  setTimeout(()=>location.href='cartas.html',1400);
}
window.adotar=adotar; window.cartaCard=cartaCard;
