// cartas.js — v6
let _lista = [];
const TONS = ["t1", "t2", "t3", "t1", "t2"];

document.addEventListener("DOMContentLoaded", async () => {
  initTabs();
  initUpload();
  initForms();
  await carregarMural();
  initFiltros();
  document.getElementById("btn-fechar")?.addEventListener("click", fecharModal);
  document.getElementById("modal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) fecharModal();
  });
});

function initTabs() {
  document.querySelectorAll(".tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((b) => {
        b.classList.remove("ativo");
        b.setAttribute("aria-selected", "false");
      });
      document
        .querySelectorAll(".tab-painel")
        .forEach((p) => p.classList.remove("ativo"));
      btn.classList.add("ativo");
      btn.setAttribute("aria-selected", "true");
      document.getElementById(`tp-${btn.dataset.tab}`)?.classList.add("ativo");
    });
  });
}

async function carregarMural(f = {}) {
  const m = document.getElementById("mural");
  m.innerHTML =
    '<div class="mural-load"><div class="spinner" style="color:var(--terracota);width:36px;height:36px;border-width:3px"></div><p>Carregando…</p></div>';
  _lista = await Cartinhas.listar({ status: "disponivel", ...f });
  renderMural(_lista);
  const el = document.getElementById("ph-disp");
  if (el) el.textContent = _lista.length;
}

function renderMural(lista) {
  const m = document.getElementById("mural");
  const c = document.getElementById("f-count");
  if (c)
    c.textContent = `${lista.length} cartinha${lista.length !== 1 ? "s" : ""}`;
  if (!lista.length) {
    m.innerHTML =
      '<div class="mural-vazio"><i class="bi bi-envelope-open"></i><p>Nenhuma cartinha encontrada.</p></div>';
    return;
  }
  const badges = {
    disponivel: '<span class="badge badge-disp">Disponível</span>',
    adotada: '<span class="badge badge-adotada">Adotada</span>',
    entregue: '<span class="badge badge-entregue">Entregue</span>',
    aguardando: '<span class="badge badge-aguard">Aguardando</span>',
  };
  m.innerHTML = lista
    .map((c, i) => {
      const idade = calcIdade(c.nascimento),
        label = PRESENTE[c.presente] || c.presente,
        tom = TONS[i % TONS.length];
      return `
      <article class="mural-card entra" style="transition-delay:${(i % 4) * 0.07}s">
        <div class="mc-topo ${tom}">
          <div class="mc-badge">${badges[c.status] || ""}</div>
          <div class="mc-nome">${c.nome_crianca}</div>
          <div class="mc-meta">${idade} anos · ${c.inst_nome}</div>
        </div>
        <div class="mc-corpo">
          <p class="mc-trecho">"${c.texto}"</p>
          <div class="mc-presente"><i class="bi bi-gift-fill"></i><span>${label}</span></div>
        </div>
        <div class="mc-rodape">
          ${
            c.status === "disponivel"
              ? `<button class="btn btn-primario btn-full btn-m" onclick="abrirModal('${c.id}')"><i class="bi bi-heart-fill"></i> Realizar este Sonho</button>`
              : `<button class="btn btn-full btn-m" disabled style="background:var(--creme-2);color:var(--mogno-fantasma);border:1.5px solid var(--pessego-esc);cursor:not-allowed">Cartinha ${c.status === "adotada" ? "já adotada" : "entregue"}</button>`
          }
        </div>
      </article>`;
    })
    .join("");
  initScrollReveal();
}

function initFiltros() {
  const inp = document.getElementById("inp-busca"),
    selP = document.getElementById("f-pres"),
    selS = document.getElementById("f-status");
  const ap = async () => {
    const st = selS?.value || "disponivel";
    if (!_lista.length || selS?._prev !== st) {
      _lista = await Cartinhas.listar({ status: st || undefined });
      if (selS) selS._prev = st;
    }
    let l = [..._lista];
    if (selP?.value) l = l.filter((c) => c.presente === selP.value);
    if (inp?.value.trim()) {
      const q = inp.value.toLowerCase();
      l = l.filter(
        (c) =>
          c.nome_crianca.toLowerCase().includes(q) ||
          c.texto.toLowerCase().includes(q) ||
          (PRESENTE[c.presente] || "").toLowerCase().includes(q),
      );
    }
    renderMural(l);
  };
  inp?.addEventListener("input", ap);
  selP?.addEventListener("change", ap);
  selS?.addEventListener("change", async () => {
    _lista = [];
    await ap();
  });
}

function abrirModal(id) {
  const c = _lista.find((x) => x.id === id);
  if (!c) return;
  const u = Auth.get(),
    label = PRESENTE[c.presente] || c.presente;
  document.getElementById("modal-body").innerHTML = `
    <div style="text-align:center;margin-bottom:var(--sp-4)">
      <div style="width:72px;height:72px;background:linear-gradient(135deg,var(--terracota-esc),var(--terracota));border-radius:var(--r-4);display:flex;align-items:center;justify-content:center;margin:0 auto var(--sp-3)"><i class="bi bi-envelope-heart-fill" style="font-size:2rem;color:var(--branco)"></i></div>
      <h2 style="font-family:var(--f-display);color:var(--mogno);font-size:var(--t-lg);margin-bottom:4px">${c.nome_crianca}</h2>
      <p style="color:var(--mogno-claro);font-size:.84rem">${calcIdade(c.nascimento)} anos · ${c.inst_nome}</p>
    </div>
    <div style="background:var(--creme);border-left:4px solid var(--terracota);border-radius:var(--r-3);padding:var(--sp-3);margin-bottom:var(--sp-3)">
      <p style="font-family:var(--f-carta);font-size:1.05rem;color:var(--mogno-medio);line-height:1.72">"${c.texto}"</p>
    </div>
    <div style="display:flex;align-items:center;gap:var(--sp-1);background:var(--terracota-pale);border:1px solid var(--terracota-borda);border-radius:var(--r-3);padding:var(--sp-2) var(--sp-3);margin-bottom:var(--sp-3)">
      <i class="bi bi-gift-fill" style="color:var(--terracota)"></i>
      <span style="font-weight:700;color:var(--terracota-esc);font-size:.85rem">Pedido: ${label}</span>
    </div>
    ${
      u
        ? `<div style="margin-bottom:var(--sp-3)">
          <label class="campo-label" for="modal-ponto" style="display:block;margin-bottom:var(--sp-1);color:var(--mogno);font-weight:600;font-size:.88rem">
            Escolha o ponto de coleta <span class="obg" aria-label="obrigatório">*</span>
          </label>
          <select id="modal-ponto" class="campo-select" required style="width:100%">
            <option value="">Selecione onde vai entregar o presente</option>
            <option value="1">📍 R. Alberto de Azevedo, 379 — Sta. Helena</option>
            <option value="2">📍 Av. Paulo Pucci, 79 — Sta. Efigênia</option>
            <option value="3">📍 R. Cândido Portinari, 899 — Campos Elísios</option>
            <option value="4">📍 R. Augusto dos Anjos, 551 — Jd. Oliveiras</option>
            <option value="5">📍 R. Manoel de Barros, 628 — Jd. Esmeralda</option>
          </select>
        </div>
        <button class="btn btn-primario btn-full btn-g" id="btn-confirmar" onclick="confirmarAdocao('${id}')">
          <i class="bi bi-heart-fill"></i> Confirmar — Vou realizar este sonho!
        </button>
        <p style="text-align:center;font-size:.72rem;color:var(--mogno-claro);margin-top:var(--sp-2)">
          <i class="bi bi-shield-check"></i> Você se compromete a comprar e entregar o presente no ponto selecionado.
        </p>`
        : `<a href="login.html" class="btn btn-primario btn-full btn-g"><i class="bi bi-person-fill"></i> Faça login para adotar</a>
        <p style="text-align:center;font-size:.76rem;color:var(--mogno-claro);margin-top:var(--sp-2)">Criar conta é grátis e leva menos de 2 minutos!</p>`
    }`;
  const modal = document.getElementById("modal");
  modal.hidden = false;
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
  setTimeout(() => modal.querySelector("button,a")?.focus(), 50);
}
async function confirmarAdocao(id) {
  const pontoSelect = document.getElementById("modal-ponto");

  // Validação: verifica se um ponto foi selecionado
  if (!pontoSelect || !pontoSelect.value) {
    toast(
      "⚠️ Por favor, selecione um ponto de coleta antes de confirmar.",
      "aviso",
    );
    pontoSelect?.focus();
    return;
  }

  const pontoTexto = pontoSelect.options[pontoSelect.selectedIndex].text;
  const btn = document.getElementById("btn-confirmar");
  if (btn) {
    btn.innerHTML =
      '<span class="spinner" aria-hidden="true"></span> Processando…';
    btn.disabled = true;
  }

  if (await Cartinhas.adotar(id, pontoSelect.value)) {
    fecharModal();
    toast(`🎁 Parabéns! Leve o presente até: ${pontoTexto}`, "sucesso", 7000);
    await carregarMural();
  }
}
function fecharModal() {
  const modal = document.getElementById("modal");
  modal.style.display = "none";
  modal.hidden = true;
  document.body.style.overflow = "";
}
/* ESC fecha modal */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !document.getElementById("modal")?.hidden)
    fecharModal();
});
window.abrirModal = abrirModal;
window.confirmarAdocao = confirmarAdocao;
window.fecharModal = fecharModal;

function initForms() {
  document
    .getElementById("form-carta")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const u = Auth.get();
      if (!u || u.tipo !== "instituicao") {
        toast("Apenas instituições podem enviar cartinhas.", "erro");
        return;
      }
      const btn = document.getElementById("btn-carta");
      btn.innerHTML = '<span class="spinner"></span> Enviando…';
      btn.disabled = true;
      try {
        await Cartinhas.criar({
          nome: document.getElementById("nc-nome").value,
          nascimento: document.getElementById("nc-nasc").value,
          presente: document.getElementById("nc-pres").value,
          texto: document.getElementById("nc-texto").value,
        });
        e.target.reset();
        document.getElementById("foto-prev").innerHTML = "";
        document.querySelector('[data-tab="adotar"]').click();
        await carregarMural();
      } catch (er) {
        toast("Erro ao enviar. Tente novamente.", "erro");
      } finally {
        btn.innerHTML =
          '<i class="bi bi-send-fill"></i> Enviar Cartinha para Análise';
        btn.disabled = false;
      }
    });
  document.getElementById("form-doacao")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const p = document.getElementById("dp-pres").value,
      co = document.getElementById("dp-col");
    if (!p || !co.value) {
      toast("Selecione o presente e o ponto de coleta.", "erro");
      return;
    }
    toast(
      `✅ Ótimo! Leve ${PRESENTE[p] || "o presente"} até: ${co.options[co.selectedIndex].text.replace("📍 ", "")}`,
      "sucesso",
      7000,
    );
    e.target.reset();
  });
}
function initUpload() {
  const a = document.getElementById("upload-box"),
    inp = document.getElementById("foto-inp");
  if (!a || !inp) return;
  a.addEventListener("click", () => inp.click());
  a.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inp.click();
    }
  });
  a.addEventListener("dragover", (e) => {
    e.preventDefault();
    a.classList.add("drag");
  });
  a.addEventListener("dragleave", () => a.classList.remove("drag"));
  a.addEventListener("drop", (e) => {
    e.preventDefault();
    a.classList.remove("drag");
    if (e.dataTransfer.files[0]) prevFoto(e.dataTransfer.files[0]);
  });
  inp.addEventListener("change", () => {
    if (inp.files[0]) prevFoto(inp.files[0]);
  });
}
function prevFoto(f) {
  const r = new FileReader();
  r.onload = (e) => {
    document.getElementById("foto-prev").innerHTML =
      `<img src="${e.target.result}" style="max-width:100%;border-radius:var(--r-3);margin-top:var(--sp-2);border:2px solid var(--pessego-esc)"/>`;
  };
  r.readAsDataURL(f);
}
