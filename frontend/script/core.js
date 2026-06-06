/* core.js — Conectando Sonhos
   Conectado ao backend Express em localhost:3000 */

const API = "http://localhost:3000/api";

const PRESENTE = {
  bonecas: "Bonecas e Acessórios",
  veiculos: "Carrinhos e Veículos",
  herois: "Bonecos de Heróis",
  pelucia: "Bichinho de Pelúcia",
  jogos: "Jogos e Quebra-Cabeças",
  educativos: "Brinquedos Educativos",
  bolas: "Bola Esportiva",
  rodas: "Skate / Patins / Patinete",
  bicicleta: "Bicicleta",
  "kit-escolar": "Kit Escolar Completo",
  mochila: "Mochila ou Estojo",
  livros: "Livros e Gibis",
  arte: "Kit de Pintura e Arte",
  roupa: "Roupas",
  tenis: "Tênis",
  sandalia: "Sandália ou Chinelo",
  higiene: "Kit de Higiene",
  tecnologia: "Eletrônico",
  outro: "Outro",
};

/* ══ HELPER HTTP ══════════════════════════════════════════ */
async function api(path, options = {}) {
  const u = Auth.get();
  const headers = { "Content-Type": "application/json" };
  if (u?.token) headers["Authorization"] = `Bearer ${u.token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  const json = await res.json();

  if (!res.ok) throw new Error(json.erro || json.message || "Erro na requisição");
  return json;
}

/* ══ AUTH ══════════════════════════════════════════════════ */
const Auth = {
  get() {
    try { return JSON.parse(localStorage.getItem("cs_u")); }
    catch { return null; }
  },
  set(u) { localStorage.setItem("cs_u", JSON.stringify(u)); },
  clear() { localStorage.removeItem("cs_u"); },

  async login(email, senha) {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, senha })
    });
    const u = {
      id: data.usuario.id,
      nome: data.usuario.nome || email.split("@")[0],
      email: data.usuario.email,
      tipo: data.usuario.tipo,
      inst_id: data.usuario.inst_id,
      token: data.token
    };
    this.set(u);
    return u;
  },

  async cadastrarDoador(d) {
    await api("/auth/registrar/doador", {
      method: "POST",
      body: JSON.stringify({
        nome: d.nome,
        email: d.email,
        senha: d.senha,
        telefone: d.telefone,
        cep: d.cep,
        uf: d.estado,
        cidade: d.cidade,
        bairro: d.bairro
      })
    });
    return true;
  },

  async cadastrarInst(d) {
    await api("/auth/registrar/instituicao", {
      method: "POST",
      body: JSON.stringify({
        nome_instituicao: d.nome,
        tipo: d.tipo,
        cnpj: d.cnpj,
        responsavel_email: d.email,
        responsavel_nome: d.responsavel,
        responsavel_telefone: d.telefone,
        senha: d.senha
      })
    });
    return true;
  },

  logout() {
    this.clear();
    window.location.href = "index.html";
  }
};

/* ══ CARTINHAS ══════════════════════════════════════════════ */
const Cartinhas = {
  async listar(f = {}) {
    const params = new URLSearchParams();
    if (f.status)    params.append("status", f.status);
    if (f.presente)  params.append("categoria_id", f.presente);
    if (f.busca)     params.append("busca", f.busca);
    if (f.limite)    params.append("limite", f.limite);
    if (f.pagina)    params.append("pagina", f.pagina);

    const qs = params.toString();
    
    const sep = qs ? "&" : "?";
    const data = await api(`/cartinhas${qs ? "?" + qs : ""}${sep}_t=${Date.now()}`);
    return (data.cartinhas || []).map(c => ({
      ...c,
      nome_crianca: c.crianca_nome,
      nascimento: c.crianca_data_nasc || null,
      presente: c.categoria_slug,
      inst_nome: c.inst_nome
    }));
  },

  async criar(d) {
    await api("/cartinhas", {
      method: "POST",
      body: JSON.stringify(d)
    });
    return true;
  },

  async adotar(id, ponto_id) {
    await api(`/cartinhas/${id}/adotar`, {
      method: "POST",
      body: JSON.stringify({ ponto_id })
    });
    return true;
  }
};

/* ══ DADOS ══════════════════════════════════════════════════ */
const Dados = {
  async impacto() {
    return await api("/impacto");
  }
};

/* ══ UTILITÁRIOS ══════════════════════════════════════════ */
function calcIdade(nasc) {
  if (!nasc) return "?";
  const n = new Date(nasc), h = new Date();
  let i = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() ||
    (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) i--;
  return i;
}

async function viacep(cep) {
  const c = cep.replace(/\D/g, "");
  if (c.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${c}/json/`);
    const d = await r.json();
    return d.erro ? null : d;
  } catch { return null; }
}

function toast(msg, tipo = "info", dur = 4500) {
  let ctr = document.querySelector(".toasts");
  if (!ctr) {
    ctr = document.createElement("div");
    ctr.className = "toasts";
    document.body.appendChild(ctr);
  }
  const icons = { sucesso: "✓", erro: "✕", aviso: "!", info: "i" };
  const el = document.createElement("div");
  el.className = `toast ${tipo}`;
  el.innerHTML = `<span style="font-weight:900;font-size:1rem;flex-shrink:0">${icons[tipo] || "i"}</span><span>${msg}</span>`;
  ctr.appendChild(el);
  setTimeout(() => {
    el.style.cssText = "transition:opacity .3s,transform .3s;opacity:0;transform:translateX(60px)";
    setTimeout(() => el.remove(), 320);
  }, dur);
}

function animNum(el, alvo, ms = 1800) {
  if (!el) return;
  let ini = null;
  const step = (ts) => {
    if (!ini) ini = ts;
    const p = Math.min((ts - ini) / ms, 1);
    const e = 1 - Math.pow(1 - p, 4);
    el.textContent = Math.round(e * alvo).toLocaleString("pt-BR");
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function initScrollReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("visivel"); obs.unobserve(e.target); }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll(".entra").forEach((el) => obs.observe(el));
}

function initMenu() {
  const pg = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a").forEach((a) => {
    if (a.getAttribute("href") === pg) {
      a.classList.add("ativo");
      a.setAttribute("aria-current", "page");
    }
  });

  const u = Auth.get();
  const navU = document.getElementById("nav-usuario");
  if (navU) {
    navU.innerHTML = u
      ? `<span class="nu-saud">Olá, ${u.nome.split(" ")[0]}</span>
         <a href="${u.tipo === "admin" ? "admin.html" : u.tipo === "doador" ? "doador.html" : "instituicao.html"}" class="btn btn-ghost btn-p">Minha Conta</a>
         <button type="button" class="btn btn-p nu-sair" data-action="logout">Sair</button>`
      : `<a href="login.html" class="btn btn-primario btn-p">Entrar</a>`;
    navU.querySelector('[data-action="logout"]')?.addEventListener("click", () => Auth.logout());
  }

  const hbg = document.querySelector(".hamburger");
  const nav = document.querySelector(".nav-links");
  if (hbg && nav) {
    hbg.addEventListener("click", () => {
      const aberto = nav.classList.toggle("aberto");
      hbg.classList.toggle("aberto", aberto);
      hbg.setAttribute("aria-expanded", aberto);
    });
    nav.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => {
      nav.classList.remove("aberto");
      hbg.classList.remove("aberto");
      hbg.setAttribute("aria-expanded", "false");
    }));
  }

  const hdr = document.querySelector(".site-header");
  if (hdr) {
    window.addEventListener("scroll", () => hdr.classList.toggle("elevado", scrollY > 20), { passive: true });
  }
  initScrollReveal();
}

window.initMenu = initMenu;