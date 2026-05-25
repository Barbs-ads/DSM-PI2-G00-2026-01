document.addEventListener("DOMContentLoaded", () => {
  const u = Auth.get();

  if (u) {
    if (u.tipo === "admin") {
      location.href = "admin.html";
    } else if (u.tipo === "doador") {
      location.href = "doador.html";
    } else {
      location.href = "instituicao.html";
    }

    return;
  }

  initAbas();
  initTipos();
  initOlhos();
  initLogin();
  initCadD();
  initCadI();
  initCEP();
});
function initAbas() {
  const t = (a) => {
    document
      .querySelectorAll(".afp-aba,.link-btn")
      .forEach((b) => b.classList.remove("ativa"));
    document
      .querySelectorAll(".afp-painel")
      .forEach((p) => p.classList.remove("ativo"));
    document
      .querySelector(`.afp-aba[data-alvo="${a}"]`)
      ?.classList.add("ativa");
    document.getElementById(`ap-${a}`)?.classList.add("ativo");
  };
  document.querySelectorAll(".afp-aba,.link-btn").forEach((el) =>
    el.addEventListener("click", () => {
      if (el.dataset.alvo) t(el.dataset.alvo);
    }),
  );
}
function initTipos() {
  document.querySelectorAll(".tipo-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".tipo-btn")
        .forEach((b) => b.classList.remove("ativo"));
      btn.classList.add("ativo");
      document
        .querySelectorAll(".cad-form")
        .forEach((f) => f.classList.remove("ativo"));
      document.getElementById(`cf-${btn.dataset.tipo}`)?.classList.add("ativo");
    });
  });
}
function initOlhos() {
  document.querySelectorAll(".btn-eye").forEach((btn) => {
    btn.addEventListener("click", () => {
      const inp = document.getElementById(btn.dataset.alvo),
        ic = btn.querySelector("i");
      if (inp.type === "password") {
        inp.type = "text";
        ic.className = "bi bi-eye-slash";
      } else {
        inp.type = "password";
        ic.className = "bi bi-eye";
      }
    });
  });
}
function initLogin() {
  document
    .getElementById("form-login")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = document.getElementById("err-login");
      err.hidden = true;
      const btn = document.getElementById("btn-login");
      btn.innerHTML = '<span class="spinner"></span> Entrando…';
      btn.disabled = true;
      try {
        const u = await Auth.login(
          document.getElementById("l-email").value,
          document.getElementById("l-senha").value,
        );
        toast(`Olá, ${u.nome.split(" ")[0]}! Bem-vindo 🧡`, "sucesso");
        setTimeout(() => {
          if (u.tipo === "admin") {
            location.href = "admin.html";
          } else if (u.tipo === "doador") {
            location.href = "doador.html";
          } else {
            location.href = "instituicao.html";
          }
        }, 900);
      } catch (ex) {
        mostrarErro(err, ex.message || "E-mail ou senha incorretos.");
        btn.innerHTML = "Entrar na minha conta";
        btn.disabled = false;
      }
    });
}
function initCadD() {
  document
    .getElementById("cf-doador")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = document.getElementById("err-doador");
      err.hidden = true;
      const s1 = document.getElementById("d-senha").value,
        s2 = document.getElementById("d-senha2").value;
      if (s1 !== s2) {
        mostrarErro(err, "As senhas não coincidem.");
        return;
      }
      if (s1.length < 8) {
        mostrarErro(err, "Mínimo de 8 caracteres.");
        return;
      }
      const btn = document.getElementById("btn-cad-d");
      btn.innerHTML = '<span class="spinner"></span>';
      btn.disabled = true;
      try {
        await Auth.cadastrarDoador({
          nome: document.getElementById("d-nome").value,
          email: document.getElementById("d-email").value,
          telefone: document.getElementById("d-tel").value,
          senha: s1,
          cep: document.getElementById("d-cep").value,
          estado: document.getElementById("d-uf").value,
          cidade: document.getElementById("d-cidade").value,
          bairro: document.getElementById("d-bairro").value,
        });
        toast("Conta criada! Faça login.", "sucesso");
        e.target.reset();
        document.querySelector('.afp-aba[data-alvo="login"]').click();
      } catch (ex) {
        mostrarErro(err, ex.message || "Erro ao criar conta.");
      } finally {
        btn.innerHTML =
          '<i class="bi bi-person-check-fill"></i> Criar minha conta';
        btn.disabled = false;
      }
    });
}
function initCadI() {
  document.getElementById("cf-inst")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("err-inst");
    err.hidden = true;
    const s1 = document.getElementById("i-senha").value,
      s2 = document.getElementById("i-senha2").value;
    if (s1 !== s2) {
      mostrarErro(err, "As senhas não coincidem.");
      return;
    }
    if (s1.length < 8) {
      mostrarErro(err, "Mínimo de 8 caracteres.");
      return;
    }
    const btn = document.getElementById("btn-cad-i");
    btn.innerHTML = '<span class="spinner"></span>';
    btn.disabled = true;
    try {
      await Auth.cadastrarInst({
        nome: document.getElementById("i-nome").value,
        tipo: document.getElementById("i-tipo").value,
        cnpj: document.getElementById("i-cnpj").value,
        email: document.getElementById("i-email").value,
        responsavel: document.getElementById("i-resp").value,
        telefone: document.getElementById("i-tel").value,
        senha: s1,
      });
      toast("Cadastro enviado! Aguarde aprovação.", "sucesso", 7000);
      e.target.reset();
    } catch (ex) {
      mostrarErro(err, ex.message || "Erro ao cadastrar.");
    } finally {
      btn.innerHTML =
        '<i class="bi bi-building-check"></i> Cadastrar Instituição';
      btn.disabled = false;
    }
  });
}
function initCEP() {
  const el = document.getElementById("d-cep");
  if (!el) return;
  el.addEventListener("input", () => {
    el.value = el.value
      .replace(/\D/g, "")
      .replace(/(\d{5})(\d)/, "$1-$2")
      .slice(0, 9);
  });
  el.addEventListener("blur", async () => {
    const d = await viacep(el.value);
    if (!d) return;
    const g = (id) => document.getElementById(id);
    if (g("d-cidade")) g("d-cidade").value = d.localidade || "";
    if (g("d-uf")) g("d-uf").value = d.uf || "";
    if (g("d-bairro")) g("d-bairro").value = d.bairro || "";
  });
}
function mostrarErro(el, msg) {
  el.innerHTML = `<i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i> ${msg}`;
  el.hidden = false;
  el.style.display = "flex";
}
