// dashboard.js — integrado com API Node.js
document.addEventListener("DOMContentLoaded", async () => {
  const u = Auth.get();
  if (!u) {
    location.href = "login.html";
    return;
  }

  /* Sidebar — nome e avatar */
  const sbNome = document.getElementById("sb-nome");
  const sbAv = document.getElementById("sb-av");
  if (sbNome) sbNome.textContent = u.nome;
  if (sbAv) sbAv.textContent = u.nome.charAt(0).toUpperCase();

  /* Perfil (doador) */
  const pNome = document.getElementById("p-nome");
  const pEmail = document.getElementById("p-email");
  if (pNome) pNome.value = u.nome;
  if (pEmail) pEmail.value = u.email;

  /* Navegação por painéis */
  document.querySelectorAll(".sb-link[data-panel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".sb-link").forEach((b) => {
        b.classList.remove("ativo");
        b.removeAttribute("aria-current");
      });
      document
        .querySelectorAll(".dash-panel")
        .forEach((p) => p.classList.remove("ativo"));
      btn.classList.add("ativo");
      btn.setAttribute("aria-current", "page");
      document
        .getElementById(`panel-${btn.dataset.panel}`)
        ?.classList.add("ativo");
    });
  });

  /* Logout */
  document.querySelectorAll('[data-action="logout"]').forEach((btn) => {
    btn.addEventListener("click", () => Auth.logout());
  });

  /* Salvar perfil */
  document.getElementById("form-perfil")?.addEventListener("submit", (e) => {
    e.preventDefault();
    toast("Disponível em breve.", "aviso");
  });

  await carregarCartinhas(u);
  initFormNova(u);
});

async function carregarCartinhas(u) {
  const lista = document.getElementById("lista-d");
  const badge = document.getElementById("badge-tot");
  if (!lista) return;

  // Loading
  lista.innerHTML =
    '<div class="lista-vazia"><div class="spinner" style="color:var(--terracota)"></div><p>Carregando…</p></div>';

  let minhasCartinhas = [];

  try {
    if (u.tipo === "instituicao") {
      // Instituição vê as cartinhas dela (filtro por inst_id via query string)
      const data = await apiGet(`/cartinhas?inst_id=${u.inst_id}`, u.token);
      minhasCartinhas = (data.cartinhas || []).map((c) => ({
        ...c,
        nome_crianca: c.crianca_nome || c.nome_crianca || "—",
        presente: c.categoria_slug || c.presente || "outro",
        nascimento: c.nascimento || null,
        inst_nome: c.inst_nome || "Minha instituição",
      }));
    } else {
      // Doador vê apenas as cartinhas que ele adotou (adotada + entregue)
      minhasCartinhas = await Cartinhas.minhasAdocoes();
    }
  } catch (err) {
    lista.innerHTML = `
      <div class="lista-vazia">
        <i class="bi bi-exclamation-triangle" aria-hidden="true"></i>
        <p>Erro ao carregar: ${err.message}</p>
      </div>`;
    return;
  }

  const exibir = minhasCartinhas.slice(0, 10);
  if (badge) badge.textContent = exibir.length;

  const rAdot = document.getElementById("r-adot");
  const rEntr = document.getElementById("r-entr");
  if (rAdot)
    rAdot.textContent = minhasCartinhas.filter(
      (c) => c.status === "adotada",
    ).length;
  if (rEntr)
    rEntr.textContent = minhasCartinhas.filter(
      (c) => c.status === "entregue",
    ).length;

  if (!exibir.length) {
    const msg =
      u.tipo === "instituicao"
        ? "Sua instituição ainda não cadastrou nenhuma cartinha."
        : 'Você ainda não adotou nenhuma cartinha. <a href="cartas.html" class="link-i">Ver o mural</a>';
    lista.innerHTML = `
      <div class="lista-vazia">
        <i class="bi bi-envelope-open" aria-hidden="true"></i>
        <p>${msg}</p>
      </div>`;
    return;
  }

  const badges = {
    disponivel: '<span class="badge badge-disp">Disponível no Mural</span>',
    adotada: '<span class="badge badge-adotada">Em andamento</span>',
    entregue: '<span class="badge badge-entregue">Entregue ✓</span>',
    aguardando: '<span class="badge badge-aguard">Em análise</span>',
    cancelada:
      '<span class="badge" style="background:#fed7d7;color:#c53030">Cancelada</span>',
  };

  window.cartinhasAtuais = exibir;

  lista.innerHTML = exibir
    .map((c) => {
      const idade = calcIdade(c.nascimento);
      const label = PRESENTE[c.presente] || c.presente;

      let botoesAcao = `
      <button type="button" class="btn btn-ghost btn-p ms-2"
        onclick="abrirModal(${JSON.stringify(c.id)})" title="Ler carta completa">
        <i class="bi bi-eye-fill"></i>
      </button>`;

      if (u.tipo === "instituicao") {
        if (c.status === "aguardando" || c.status === "disponivel") {
          botoesAcao += `
          <button type="button" class="btn btn-outline btn-p ms-1"
            style="color:#fc8181;border-color:#fc8181;"
            onclick="excluirCartinha(${JSON.stringify(c.id)})" title="Cancelar cartinha">
            <i class="bi bi-trash3-fill"></i>
          </button>`;
        }
      } else {
        if (c.status === "adotada") {
          botoesAcao += `
          <button type="button" class="btn btn-outline btn-p ms-1"
            style="color:#fc8181;border-color:#fc8181;"
            onclick="desistirCartinha(${JSON.stringify(c.id)})" title="Desistir da adoção">
            <i class="bi bi-x-circle-fill"></i>
          </button>`;
        }
      }

      return `
      <div class="item-d">
        <div class="id-icon"><i class="bi bi-envelope-heart-fill"></i></div>
        <div style="flex:1">
          <div class="id-nome">${c.nome_crianca}</div>
          <div class="id-meta">${idade !== "?" ? idade + " anos" : ""} · ${label}</div>
          <div class="id-trecho">"${(c.texto || "").slice(0, 90)}…"</div>
        </div>
        <div class="id-acoes d-flex align-items-center">
          ${badges[c.status] || ""}
          ${botoesAcao}
        </div>
      </div>`;
    })
    .join("");
}

function initFormNova(u) {
  const form = document.getElementById("form-nova");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn =
      form.querySelector('button[type="submit"]') ||
      document.getElementById("btn-nova");
    const textoOriginal = btn ? btn.innerHTML : "";
    if (btn) {
      btn.innerHTML = '<span class="spinner"></span> Enviando…';
      btn.disabled = true;
    }

    try {
      await Cartinhas.criar({
        nome: document.getElementById("fn-nome").value.trim(),
        nascimento: document.getElementById("fn-nasc").value,
        presente: document.getElementById("fn-pres").value,
        texto: document.getElementById("fn-txt").value.trim(),
      });
      form.reset();
      toast("✅ Cartinha enviada para análise!", "sucesso");
      // Recarrega a lista de cartinhas da instituição
      await carregarCartinhas(u);
    } catch (err) {
      toast(`Erro ao enviar: ${err.message}`, "erro");
    } finally {
      if (btn) {
        btn.innerHTML =
          textoOriginal ||
          '<i class="bi bi-send-fill"></i> Enviar para Análise';
        btn.disabled = false;
      }
    }
  });
}

/* Modal de leitura */
window.abrirModal = (id) => {
  const modal = document.getElementById("modal-leitura");
  const cartinha = window.cartinhasAtuais?.find(
    (c) => c.id === id || String(c.id) === String(id),
  );
  if (cartinha && modal) {
    document.getElementById("modal-tit").textContent =
      `Carta de ${cartinha.nome_crianca}`;
    document.getElementById("modal-tag").textContent =
      PRESENTE[cartinha.presente] || cartinha.presente;
    document.getElementById("modal-txt").textContent = `"${cartinha.texto}"`;
    modal.showModal();
  }
};

window.fecharModal = () => {
  document.getElementById("modal-leitura")?.close();
};

/* Desistir da adoção — chama endpoint de cancelar */
window.desistirCartinha = async (id) => {
  if (
    !confirm(
      "Tem certeza que deseja cancelar este apadrinhamento? A cartinha voltará para o mural público.",
    )
  )
    return;
  try {
    const u = Auth.get();
    await apiPost(`/admin/cartinhas/${id}/aprovar`, {}, u.token, "PATCH");
    toast("Adoção cancelada. A cartinha voltou para o mural.", "aviso");
    await carregarCartinhas(u);
  } catch (error) {
    toast("Erro ao cancelar. Tente novamente.", "erro");
  }
};

/* Excluir/cancelar cartinha (instituição) */
window.excluirCartinha = async (id) => {
  if (
    !confirm(
      "Tem certeza que deseja remover esta cartinha? Esta ação não pode ser desfeita.",
    )
  )
    return;
  try {
    const u = Auth.get();
    await apiPost(
      `/admin/cartinhas/${id}/aprovar`,
      { motivo: "Removida pela instituição" },
      u.token,
      "PATCH",
    );
    toast("Cartinha removida com sucesso.", "sucesso");
    await carregarCartinhas(u);
  } catch (error) {
    toast("Erro ao remover. Tente novamente.", "erro");
  }
};
