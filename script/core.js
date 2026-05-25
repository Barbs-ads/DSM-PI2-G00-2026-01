/* core.js — Conectando Sonhos v7 "Sistema Postal"
   Configuração Supabase: mude DEMO para false e preencha as credenciais. */

const DEMO = true;
const SB_URL = "https://SEU_PROJETO.supabase.co";
const SB_KEY = "SUA_ANON_KEY";

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

let _sb = null;
function getSB() {
  if (!_sb && !DEMO && typeof supabase !== "undefined")
    _sb = supabase.createClient(SB_URL, SB_KEY);
  return _sb;
}

/* ══ AUTH ══════════════════════════════════════════════════ */
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
  async login(email, senha) {
    if (DEMO) {
      const e = email.toLowerCase().trim();
      let tipo = "doador";

      if (e.includes("admin") || e.includes("administrador")) {
        tipo = "admin";
      } else if (
        e.includes("inst") ||
        e.includes("ong") ||
        e.includes("pastoral")
      ) {
        tipo = "instituicao";
      }
      const nome =
        e
          .split("@")[0]
          .split(/[._-]/)
          .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
          .join(" ")
          .trim() || "Usuário";
      const u = { id: "demo-1", nome, email: e, tipo };
      this.set(u);
      return u;
    }
    const { data, error } = await getSB().auth.signInWithPassword({
      email,
      password: senha,
    });
    if (error) throw new Error(error.message);
    const { data: p } = await getSB()
      .from("usuarios")
      .select("*")
      .eq("id", data.user.id)
      .single();
    const u = p || {
      id: data.user.id,
      email,
      tipo: "doador",
      nome: email.split("@")[0],
    };
    this.set(u);
    return u;
  },
  async cadastrarDoador(d) {
    if (DEMO) {
      toast(
        "Cadastro simulado. Configure o Supabase para persistência real.",
        "aviso",
      );
      return true;
    }
    const { data, error } = await getSB().auth.signUp({
      email: d.email,
      password: d.senha,
    });
    if (error) throw new Error(error.message);
    await getSB().from("usuarios").insert({
      id: data.user.id,
      nome: d.nome,
      email: d.email,
      telefone: d.telefone,
      tipo: "doador",
      cep: d.cep,
      estado: d.estado,
      cidade: d.cidade,
      bairro: d.bairro,
    });
    return true;
  },
  async cadastrarInst(d) {
    if (DEMO) {
      toast(
        "Cadastro simulado. Configure o Supabase para persistência real.",
        "aviso",
      );
      return true;
    }
    const { data, error } = await getSB().auth.signUp({
      email: d.email,
      password: d.senha,
    });
    if (error) throw new Error(error.message);
    await getSB().from("usuarios").insert({
      id: data.user.id,
      nome: d.responsavel,
      email: d.email,
      telefone: d.telefone,
      tipo: "instituicao",
    });
    await getSB().from("instituicoes").insert({
      id: data.user.id,
      nome_inst: d.nome,
      tipo_inst: d.tipo,
      cnpj: d.cnpj,
      responsavel: d.responsavel,
    });
    return true;
  },
  logout() {
    this.clear();
    if (!DEMO && getSB()) getSB().auth.signOut();
    window.location.href = "index.html";
  },
};

/* ══ CARTINHAS ══════════════════════════════════════════════ */
const Cartinhas = {
  async listar(f = {}) {
    if (DEMO) return _filtrar([..._MOCK], f);
    let q = getSB()
      .from("cartinhas")
      .select("*, inst:inst_id(nome_inst)")
      .order("created_at", { ascending: false });
    if (f.status) q = q.eq("status", f.status);
    if (f.presente) q = q.eq("presente", f.presente);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data || []).map((c) => ({
      ...c,
      inst_nome: c.inst?.nome_inst || "Instituição parceira",
    }));
  },
  async criar(d) {
    if (DEMO) {
      toast("✉️ Cartinha enviada para análise!", "sucesso");
      return true;
    }
    const u = Auth.get();
    const { error } = await getSB().from("cartinhas").insert({
      nome_crianca: d.nome,
      nascimento: d.nascimento,
      presente: d.presente,
      texto: d.texto,
      inst_id: u?.id,
      status: "aguardando",
    });
    if (error) throw new Error(error.message);
    return true;
  },
  async adotar(id, pontoColeta) {
    if (DEMO) {
      toast("🎁 Você acabou de realizar um sonho! Obrigado.", "sucesso", 6000);
      return true;
    }
    const u = Auth.get();
    const { error } = await getSB()
      .from("cartinhas")
      .update({
        status: "adotada",
        doador_id: u?.id,
        ponto_coleta: pontoColeta,
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  },
};

/* ══ DADOS ══════════════════════════════════════════════════ */
const Dados = {
  async impacto() {
    if (DEMO)
      return { total: 247, adotadas: 183, entregues: 148, doadores: 412 };
    const [a, b, c, d] = await Promise.all([
      getSB().from("cartinhas").select("*", { count: "exact", head: true }),
      getSB()
        .from("cartinhas")
        .select("*", { count: "exact", head: true })
        .in("status", ["adotada", "entregue"]),
      getSB()
        .from("cartinhas")
        .select("*", { count: "exact", head: true })
        .eq("status", "entregue"),
      getSB()
        .from("usuarios")
        .select("*", { count: "exact", head: true })
        .eq("tipo", "doador"),
    ]);
    return {
      total: a.count || 0,
      adotadas: b.count || 0,
      entregues: c.count || 0,
      doadores: d.count || 0,
    };
  },
};

/* ══ MOCK ══════════════════════════════════════════════════ */
const _MOCK = [
  {
    id: "c1",
    nome_crianca: "Ana Luiza",
    nascimento: "2017-03-12",
    presente: "bonecas",
    texto:
      "Querido Papai Noel, eu nunca tive uma boneca só minha de verdade. Meu sonho é ter uma com cabelo comprido pra pentear e dar banho. Ia chamar ela de Princesa e ser a melhor mãe do mundo pra ela!",
    status: "disponivel",
    inst_nome: "ONG Raízes",
  },
  {
    id: "c2",
    nome_crianca: "Miguel",
    nascimento: "2016-07-08",
    presente: "veiculos",
    texto:
      "Oi, eu sou Miguel e tenho 8 anos. Adoro corrida e meu sonho é ter um carrinho de controle remoto igual ao do meu amigo Kaique. A gente ia brincar todo recreio e eu ia ser o campeão!",
    status: "disponivel",
    inst_nome: "Pastoral do Menor",
  },
  {
    id: "c3",
    nome_crianca: "Sofia",
    nascimento: "2018-11-25",
    presente: "pelucia",
    texto:
      "Eu quero um ursinho de pelúcia grandão pra abraçar quando fico com medo à noite. Mamãe disse que ursinho espanta pesadelo. Eu cuidaria muito bem dele e daria banho todo sábado.",
    status: "disponivel",
    inst_nome: "Lar Esperança",
  },
  {
    id: "c4",
    nome_crianca: "Pedro H.",
    nascimento: "2015-04-02",
    presente: "bicicleta",
    texto:
      "Tenho 11 anos e meu maior sonho é uma bicicleta pra ir pra escola sem pegar ônibus cheio. Assim minha mãe economiza a passagem e eu chego mais rápido. Prometo cuidar dela e pedalar todo dia!",
    status: "disponivel",
    inst_nome: "Casa da Criança",
  },
  {
    id: "c5",
    nome_crianca: "Isabella",
    nascimento: "2017-09-18",
    presente: "kit-escolar",
    texto:
      "Preciso de lápis de cor e caderno novos. O meu acabou e fico sem fazer atividades de arte. Quero ser professora quando crescer. Minha profe disse que tenho talento pra desenhar flores e borboletas!",
    status: "disponivel",
    inst_nome: "ONG Raízes",
  },
  {
    id: "c6",
    nome_crianca: "Lucas",
    nascimento: "2016-01-30",
    presente: "bolas",
    texto:
      "Sou apaixonado por futebol desde bebê. Meu pai diz que tenho talento mas não tenho bola. Com uma bola boa eu treino todo dia e quem sabe um dia eu jogo pelo Brasil!",
    status: "entregue",
    inst_nome: "Pastoral do Menor",
  },
  {
    id: "c7",
    nome_crianca: "Maria Clara",
    nascimento: "2019-06-14",
    presente: "arte",
    texto:
      "Adoro pintar mas só tenho um lápis de grafite. Com tintas eu podia fazer quadros coloridos e dar de presente pra minha vovó que tá doente no hospital. Ela ia ficar tão feliz!",
    status: "disponivel",
    inst_nome: "Lar Esperança",
  },
  {
    id: "c8",
    nome_crianca: "Enzo R.",
    nascimento: "2015-12-03",
    presente: "jogos",
    texto:
      "Quero um jogo de tabuleiro pra jogar com minha irmã e minha vovó. Assim a gente se diverte junto sem precisar de celular que a gente não tem em casa. Seria a melhor tarde!",
    status: "disponivel",
    inst_nome: "Casa da Criança",
  },
  {
    id: "c9",
    nome_crianca: "Valentina",
    nascimento: "2018-05-20",
    presente: "livros",
    texto:
      "Eu amo ler mas na biblioteca tem fila grande e poucos livros. Se eu tiver livros em casa posso ler toda hora! Quero ser escritora e escrever histórias de princesas corajosas que salvam o mundo.",
    status: "disponivel",
    inst_nome: "ONG Raízes",
  },
  {
    id: "c10",
    nome_crianca: "Arthur M.",
    nascimento: "2016-08-14",
    presente: "tenis",
    texto:
      "Meu tênis furou na sola e quando chove entra água. Chego na escola com pé molhado e fico envergonhado. Um tênis novo seria incrível pra eu chegar bonito e estudar sem sofrer no frio.",
    status: "disponivel",
    inst_nome: "Casa da Criança",
  },
  {
    id: "c11",
    nome_crianca: "Lívia",
    nascimento: "2019-02-28",
    presente: "roupa",
    texto:
      "Cresci e minhas roupas ficaram pequeninhas. Minha mãe tá procurando emprego. Quero roupas novas pra ir na escola bonita e ter amigas. É triste usar roupa curta demais na frente de todo mundo.",
    status: "adotada",
    inst_nome: "Lar Esperança",
  },
  {
    id: "c12",
    nome_crianca: "Gustavo",
    nascimento: "2017-10-05",
    presente: "educativos",
    texto:
      "Gosto de montar coisas e inventar brinquedos com caixas e palitos. Minha profe disse que tenho jeito de engenheiro! Quero um brinquedo de montar de verdade pra aprender como tudo funciona.",
    status: "disponivel",
    inst_nome: "Pastoral do Menor",
  },
];

function _filtrar(lista, f) {
  if (f.status) lista = lista.filter((c) => c.status === f.status);
  if (f.presente) lista = lista.filter((c) => c.presente === f.presente);
  if (f.busca) {
    const q = f.busca.toLowerCase();
    lista = lista.filter(
      (c) =>
        c.nome_crianca.toLowerCase().includes(q) ||
        c.texto.toLowerCase().includes(q) ||
        (PRESENTE[c.presente] || "").toLowerCase().includes(q) ||
        c.inst_nome.toLowerCase().includes(q),
    );
  }
  return lista;
}

/* ══ UTILITÁRIOS ══════════════════════════════════════════ */
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
        <a href="${
          u.tipo === "admin"
            ? "admin.html"
            : u.tipo === "doador"
              ? "doador.html"
              : "instituicao.html"
        }" class="btn btn-ghost btn-p">Minha Conta</a>
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
    /* Fecha menu mobile ao navegar */
    nav.querySelectorAll("a").forEach((a) =>
      a.addEventListener("click", () => {
        nav.classList.remove("aberto");
        hbg.classList.remove("aberto");
        hbg.setAttribute("aria-expanded", "false");
      }),
    );
  }

  const hdr = document.querySelector(".site-header");
  if (hdr) {
    window.addEventListener(
      "scroll",
      () => hdr.classList.toggle("elevado", scrollY > 20),
      { passive: true },
    );
  }
  initScrollReveal();
}
/* initMenu é chamado por partial.js após injeção do header.
   Páginas legadas com header hardcoded chamam diretamente. */
window.initMenu = initMenu;
