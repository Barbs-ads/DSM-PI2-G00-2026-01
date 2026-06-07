/* core.js — Conectando Sonhos v7 API-Only
   Sem dados falsos. Leitura direta da API Node.js.
*/

const API_URL = "http://localhost:3000/api";

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

/* ══ HELPERS DE FETCH ═══════════════════════════════════════════ */
async function apiGet(path, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`);
  return data;
}

async function apiPost(path, body, token = null, method = "POST") {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.erro || `Erro ${res.status}`);
  return data;
}

/* ══ ADAPTER ════════════════════════════════════════════════════ */
function _adaptarCartinha(c) {
  return {
    ...c,
    nome_crianca: c.crianca_nome || c.nome_crianca || "—",
    presente: c.categoria_slug || c.presente || "outro",
    inst_nome: c.inst_nome || "Instituição parceira",
    nascimento: c.nascimento || _idadeParaData(c.crianca_idade),
  };
}

function _idadeParaData(idade) {
  if (idade == null) return null;
  const ano = new Date().getFullYear() - Math.round(idade);
  return `${ano}-06-15`;
}

/* ══ AUTH ════════════════════════════════════════════════════ */
const Auth = {
  get() {
    try {
      return JSON.parse(localStorage.getItem("cs_u"));
    } catch {
      return null;
    }
  },
  set(u) {
    localStorage.setItem("cs_u", JSON.stringify(u));
  },
  clear() {
    localStorage.removeItem("cs_u");
  },
  getToken() {
    return this.get()?.token || null;
  },

  async login(email, senha) {
    const data = await apiPost("/auth/login", { email, senha });
    const u = {
      id: data.usuario.id,
      nome: data.usuario.nome || email.split("@")[0],
      email: data.usuario.email,
      tipo: data.usuario.tipo || "doador",
      inst_id: data.usuario.inst_id || null,
      token: data.token,
    };
    this.set(u);
    return u;
  },

  async cadastrarDoador(d) {
    await apiPost("/auth/registrar/doador", {
      nome: d.nome,
      email: d.email,
      senha: d.senha,
      telefone: d.telefone || "",
      cep: d.cep || "",
      uf: d.estado || d.uf || "",
      cidade: d.cidade || "",
      bairro: d.bairro || "",
    });
    return true;
  },

  async cadastrarInst(d) {
    await apiPost("/auth/registrar/instituicao", {
      nome_instituicao: d.nome,
      tipo: d.tipo || "ong",
      cnpj: d.cnpj || "",
      email_instituicao: d.email,
      responsavel_nome: d.responsavel,
      responsavel_email: d.email,
      responsavel_telefone: d.telefone || "",
      telefone: d.telefone || "",
      cidade: d.cidade || "Franca",
      uf: d.uf || "SP",
      senha: d.senha,
    });
    return true;
  },

  logout() {
    this.clear();
    window.location.href = "index.html";
  },
};

/* ══ CARTINHAS ══════════════════════════════════════════════ */
const Cartinhas = {
  async listar(f = {}) {
    const params = new URLSearchParams();
    if (f.status) params.set("status", f.status);
    if (f.categoria_id) params.set("categoria_id", f.categoria_id);
    if (f.inst_id) params.set("inst_id", f.inst_id);
    if (f.busca) params.set("busca", f.busca);

    const qs = params.toString();
    const data = await apiGet(`/cartinhas${qs ? "?" + qs : ""}`);
    return (data.cartinhas || []).map(_adaptarCartinha);
  },

  async criar(d) {
    const token = Auth.getToken();
    if (!token) throw new Error("Faça login para enviar uma cartinha.");

    // Converte o texto do select para o ID numérico que o backend exige
    await apiPost(
      "/cartinhas",
      {
        nome_crianca: d.nome,
        nascimento: d.nascimento,
        presente: d.presente,
        texto: d.texto,
      },
      token,
    );

    return true;
  },

  async adotar(id, pontoId) {
    const u = Auth.get();
    if (!u || !u.token) {
      toast("Faça login para adotar uma cartinha.", "erro");
      return false;
    }
    await apiPost(
      `/cartinhas/${id}/adotar`,
      { ponto_id: parseInt(pontoId) },
      u.token,
    );
    return true;
  },

  async minhasAdocoes() {
    const token = Auth.getToken();
    if (!token) return [];
    const data = await apiGet("/cartinhas/doador/minhas", token);
    return (data.cartinhas || []).map(_adaptarCartinha);
  },
};

/* ══ DADOS (KPIs) ════════════════════════════════════════ */
const Dados = {
  async impacto() {
    // Agora busca apenas dados reais, sem usar números inventados se der erro!
    const dadosReais = await apiGet("/impacto");
    return dadosReais;
  },
};

/* ══ UTILITÁRIOS ════════════════════════════════════════ */
function calcIdade(nasc) {
  if (!nasc) return "?";
  const n = new Date(nasc),
    h = new Date();
  let i = h.getFullYear() - n.getFullYear();
  if (
    h.getMonth() < n.getMonth() ||
    (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())
  )
    i--;
  return i;
}

async function viacep(cep) {
  const c = cep.replace(/\D/g, "");
  if (c.length !== 8) return null;
  try {
    const r = await fetch(`https://viacep.com.br/ws/${c}/json/`);
    const d = await r.json();
    return d.erro ? null : d;
  } catch {
    return null;
  }
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
    el.style.cssText =
      "transition:opacity .3s,transform .3s;opacity:0;transform:translateX(60px)";
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
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("visivel");
          obs.unobserve(e.target);
        }
      });
    },
    { threshold: 0.1 },
  );
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
      ? `<span class="nu-saud" aria-label="Usuário logado">Olá, ${u.nome.split(" ")[0]}</span>
         <a href="${u.tipo === "admin" ? "admin.html" : u.tipo === "doador" ? "doador.html" : "instituicao.html"}" class="btn btn-ghost btn-p">Minha Conta</a>
         <button type="button" class="btn btn-p nu-sair" data-action="logout" aria-label="Sair da conta">Sair</button>`
      : `<a href="login.html" class="btn btn-primario btn-p">Entrar</a>`;
    navU
      .querySelector('[data-action="logout"]')
      ?.addEventListener("click", () => Auth.logout());
  }

  const hbg = document.querySelector(".hamburger");
  const nav = document.querySelector(".nav-links");
  if (hbg && nav) {
    hbg.addEventListener("click", () => {
      const aberto = nav.classList.toggle("aberto");
      hbg.classList.toggle("aberto", aberto);
      hbg.setAttribute("aria-expanded", aberto);
    });
  }

  // 👇 ESSA É A PARTE QUE FALTAVA PARA O CONTEÚDO APARECER 👇
  const hdr = document.querySelector(".site-header");
  if (hdr) {
    window.addEventListener(
      "scroll",
      () => hdr.classList.toggle("elevado", scrollY > 20),
      { passive: true },
    );
  }

  // Gatilho que revela as imagens e textos nas páginas Sobre, Impacto, etc.
  initScrollReveal();
}

window.initMenu = initMenu;
