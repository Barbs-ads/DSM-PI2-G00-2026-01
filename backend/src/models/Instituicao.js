const { supabase, getSupabaseAutenticado, getSupabaseAdmin } = require('../config/supabase');

class Instituicao {

  // ── LISTAR VERIFICADAS (público) ───────────────────────────────
  static async buscarTodasAprovadas() {
    try {
      const { data, error } = await supabase
        .from('instituicoes')
        .select('id, nome, tipo, cidade, uf')
        .eq('verificada', true)
        .eq('ativa', true);
      if (error) throw error;
      return data || [];
    } catch (erro) {
      console.error('❌ Erro ao buscar instituições:', erro.message);
      throw erro;
    }
  }

  // ── LISTAR TODAS (admin) ────────────────────────────────────────
  // Usa service-role para evitar loop de RLS em is_admin()
  static async buscarTodas(token) {
    try {
      const client = getSupabaseAdmin();
      const { data, error } = await client
        .from('instituicoes')
        .select('id, nome, tipo, cnpj, email, telefone, endereco, bairro, cidade, uf, responsavel_nome, responsavel_email, responsavel_telefone, verificada, ativa, observacoes, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (erro) {
      throw erro;
    }
  }

  // ── APROVAR ────────────────────────────────────────────────────
  static async aprovar(id, token) {
    try {
      const client = getSupabaseAutenticado(token);
      const { data, error } = await client
        .from('instituicoes')
        .update({ verificada: true })
        .eq('id', id)
        .select();
      if (error) throw error;
      return data[0];
    } catch (erro) {
      throw erro;
    }
  }

  // ── CRIAR (admin cria direto, já aprovada) ─────────────────────
  static async criar(dados, token) {
    try {
      const client = getSupabaseAdmin();
      const { data, error } = await client
        .from('instituicoes')
        .insert({
          nome:                  dados.nome,
          tipo:                  dados.tipo || 'ong',
          cnpj:                  dados.cnpj || null,
          email:                 dados.email,
          telefone:              dados.telefone || null,
          endereco:              dados.endereco || null,
          bairro:                dados.bairro || null,
          cidade:                dados.cidade || 'Franca',
          uf:                    (dados.uf || 'SP').toUpperCase().slice(0, 2),
          responsavel_nome:      dados.responsavel_nome || dados.nome,
          responsavel_email:     dados.responsavel_email || dados.email,
          responsavel_telefone:  dados.responsavel_telefone || null,
          verificada:            dados.verificada === true || dados.verificada === 'true',
          ativa:                 true,
          observacoes:           dados.observacoes || null,
        })
        .select();
      if (error) throw error;
      return data[0];
    } catch (erro) {
      throw erro;
    }
  }

  // ── ATUALIZAR ──────────────────────────────────────────────────
  static async atualizar(id, dados, token) {
    try {
      const client = getSupabaseAdmin();
      const campos = {};
      const permitidos = [
        'nome','tipo','cnpj','email','telefone','endereco','bairro',
        'cidade','uf','responsavel_nome','responsavel_email',
        'responsavel_telefone','verificada','observacoes'
      ];
      permitidos.forEach(k => {
        if (dados[k] !== undefined) campos[k] = dados[k];
      });
      if (campos.uf) campos.uf = campos.uf.toUpperCase().slice(0, 2);
      const { data, error } = await client
        .from('instituicoes')
        .update(campos)
        .eq('id', id)
        .select();
      if (error) throw error;
      return data[0];
    } catch (erro) {
      throw erro;
    }
  }

  // ── DESATIVAR (soft-delete) ────────────────────────────────────
  static async desativar(id, token) {
    try {
      const client = getSupabaseAdmin();
      const { data, error } = await client
        .from('instituicoes')
        .update({ ativa: false })
        .eq('id', id)
        .select();
      if (error) throw error;
      return data[0];
    } catch (erro) {
      throw erro;
    }
  }
}

module.exports = Instituicao;