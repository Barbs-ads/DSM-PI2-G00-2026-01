const { supabase, getSupabaseAutenticado } = require("../config/supabase");

class Cartinha {

  // ── LISTAR TODAS (público — usa a view) ───────────────────────
  static async buscarTodas(filtros = {}) {
    try {
      let query = supabase.from("vw_cartinhas_publicas").select("*");

      if (filtros.status)      query = query.eq("status",      filtros.status);
      if (filtros.categoria_id)query = query.eq("categoria_id",parseInt(filtros.categoria_id));
      if (filtros.inst_id)     query = query.eq("inst_id",     parseInt(filtros.inst_id));
      if (filtros.busca)       query = query.ilike("texto",    `%${filtros.busca}%`);

      if (filtros.limite) {
        const offset = filtros.offset || 0;
        query = query.range(offset, offset + filtros.limite - 1);
      }

      query = query.order("enviada_em", { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (erro) {
      console.error("❌ Erro ao listar cartinhas:", erro.message);
      throw erro;
    }
  }

  // ── BUSCAR POR ID (público — usa a view) ──────────────────────
  static async buscarPorId(id) {
    try {
      const { data, error } = await supabase
        .from("vw_cartinhas_publicas")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    } catch (erro) {
      console.error("❌ Erro ao buscar cartinha:", erro.message);
      throw erro;
    }
  }

  // ── ADOTAR (RPC do banco) ─────────────────────────────────────
  static async adotar(cartinhaId, pontoId, token) {
    try {
      const client = getSupabaseAutenticado(token);
      const { data, error } = await client.rpc("adotar_cartinha", {
        _cartinha_id: cartinhaId,
        _ponto_id:    pontoId,
      });
      if (error) throw error;
      return data;
    } catch (erro) {
      console.error("❌ Erro no model adotar:", erro.message);
      throw erro;
    }
  }

  // ── CRIAR (instituição — direto na tabela) ────────────────────
  static async criar(dados, token) {
    try {
      const client = getSupabaseAutenticado(token);

      if (!dados.crianca_id || !dados.inst_id || !dados.categoria_id)
        throw new Error("crianca_id, inst_id e categoria_id são obrigatórios");
      if (!dados.texto || dados.texto.length < 20)
        throw new Error("Texto deve ter no mínimo 20 caracteres");

      const { data, error } = await client
        .from("cartinhas")
        .insert({
          crianca_id:   dados.crianca_id,
          inst_id:      dados.inst_id,
          categoria_id: dados.categoria_id,
          texto:        dados.texto,
          foto_url:     dados.foto_url || null,
          status:       "aguardando",
        })
        .select();
      if (error) throw error;
      return data[0];
    } catch (erro) {
      console.error("❌ Erro ao criar cartinha:", erro.message);
      throw erro;
    }
  }

  // ── APROVAR ───────────────────────────────────────────────────
  static async aprovar(cartinhaId, token) {
    try {
      const client = getSupabaseAutenticado(token);
      const { data, error } = await client
        .from("cartinhas")
        .update({ status: "disponivel", aprovada_em: new Date() })
        .eq("id", cartinhaId)
        .select();
      if (error) throw error;
      return data[0];
    } catch (erro) {
      console.error("❌ Erro ao aprovar:", erro.message);
      throw erro;
    }
  }

  // ── MARCAR ENTREGUE ───────────────────────────────────────────
  static async marcarEntregue(cartinhaId, token) {
    try {
      const client = getSupabaseAutenticado(token);
      const { data, error } = await client
        .from("cartinhas")
        .update({ status: "entregue", entregue_em: new Date() })
        .eq("id", cartinhaId)
        .select();
      if (error) throw error;
      return data[0];
    } catch (erro) {
      console.error("❌ Erro ao marcar entregue:", erro.message);
      throw erro;
    }
  }

  // ── CANCELAR ─────────────────────────────────────────────────
  static async cancelar(cartinhaId, motivo, token) {
    try {
      const client = getSupabaseAutenticado(token);
      const { data, error } = await client
        .from("cartinhas")
        .update({ status: "cancelada", cancelada_em: new Date(), motivo_cancel: motivo })
        .eq("id", cartinhaId)
        .select();
      if (error) throw error;
      return data[0];
    } catch (erro) {
      console.error("❌ Erro ao cancelar:", erro.message);
      throw erro;
    }
  }

  // ── MINHAS ADOÇÕES ────────────────────────────────────────────
  // Busca direto da tabela cartinhas filtrando pelo doador_id explicitamente.
  // A vw_cartinhas_publicas não expõe doador_id, então o RLS sozinho não
  // consegue distinguir qual doador está pedindo — causava retornar tudo.
  static async minhasAdocoes(token, usuarioId) {
    try {
      const client = getSupabaseAutenticado(token);
      const { data, error } = await client
        .from("cartinhas")
        .select(`
          id,
          texto,
          foto_url,
          status,
          enviada_em,
          adotada_em,
          entregue_em,
          doador_id,
          ponto_id,
          criancas ( nome, data_nasc, genero ),
          categorias_presente ( id, slug, nome, grupo, icone ),
          instituicoes ( id, nome, cidade )
        `)
        .eq("doador_id", usuarioId)
        .in("status", ["adotada", "entregue"])
        .order("adotada_em", { ascending: false });

      if (error) throw error;

      // Normaliza para o mesmo formato que a view pública usa
      return (data || []).map((c) => ({
        id:              c.id,
        texto:           c.texto,
        foto_url:        c.foto_url,
        status:          c.status,
        enviada_em:      c.enviada_em,
        adotada_em:      c.adotada_em,
        entregue_em:     c.entregue_em,
        doador_id:       c.doador_id,
        ponto_id:        c.ponto_id,
        crianca_nome:    c.criancas?.nome?.split(" ")[0] || "—",
        crianca_idade:   c.criancas?.data_nasc
          ? Math.floor((Date.now() - new Date(c.criancas.data_nasc)) / 3.15576e10)
          : null,
        crianca_genero:  c.criancas?.genero,
        nascimento:      c.criancas?.data_nasc || null,
        categoria_id:    c.categorias_presente?.id,
        categoria_slug:  c.categorias_presente?.slug || "outro",
        categoria_nome:  c.categorias_presente?.nome,
        categoria_grupo: c.categorias_presente?.grupo,
        categoria_icone: c.categorias_presente?.icone,
        inst_id:         c.instituicoes?.id,
        inst_nome:       c.instituicoes?.nome,
        inst_cidade:     c.instituicoes?.cidade,
      }));
    } catch (erro) {
      console.error("❌ Erro ao buscar adoções:", erro.message);
      throw erro;
    }
  }

  // ── BUSCAR TODAS (admin — inclui status "aguardando" e "cancelada") ──
  // A vw_cartinhas_publicas filtra WHERE status IN ('disponivel','adotada','entregue'),
  // escondendo as cartinhas pendentes. O admin precisa ver tudo.
  static async buscarTodasAdmin(token) {
    try {
      const client = getSupabaseAutenticado(token);
      const { data, error } = await client
        .from("cartinhas")
        .select(`
          id,
          texto,
          foto_url,
          status,
          enviada_em,
          aprovada_em,
          adotada_em,
          entregue_em,
          cancelada_em,
          doador_id,
          ponto_id,
          criancas ( nome, data_nasc ),
          categorias_presente ( id, slug, nome ),
          instituicoes ( id, nome, cidade )
        `)
        .order("enviada_em", { ascending: false });

      if (error) throw error;

      return (data || []).map((c) => ({
        id:             c.id,
        texto:          c.texto,
        foto_url:       c.foto_url,
        status:         c.status,
        enviada_em:     c.enviada_em,
        adotada_em:     c.adotada_em,
        entregue_em:    c.entregue_em,
        cancelada_em:   c.cancelada_em,
        doador_id:      c.doador_id,
        crianca_nome:   c.criancas?.nome?.split(" ")[0] || "—",
        crianca_idade:  c.criancas?.data_nasc
          ? Math.floor((Date.now() - new Date(c.criancas.data_nasc)) / 3.15576e10)
          : null,
        categoria_id:   c.categorias_presente?.id,
        categoria_slug: c.categorias_presente?.slug || "outro",
        categoria_nome: c.categorias_presente?.nome,
        inst_id:        c.instituicoes?.id,
        inst_nome:      c.instituicoes?.nome,
        inst_cidade:    c.instituicoes?.cidade,
      }));
    } catch (erro) {
      console.error("❌ Erro ao buscar cartinhas (admin):", erro.message);
      throw erro;
    }
  }

  // ── CARTINHAS POR INSTITUIÇÃO ─────────────────────────────────
  static async cartinhasPorInstituicao(instId, token) {
    try {
      const client = getSupabaseAutenticado(token);
      const { data, error } = await client
        .from("vw_cartinhas_publicas")
        .select("*")
        .eq("inst_id", instId);
      if (error) throw error;
      return data || [];
    } catch (erro) {
      console.error("❌ Erro ao buscar cartinhas da instituição:", erro.message);
      throw erro;
    }
  }
}

module.exports = Cartinha;