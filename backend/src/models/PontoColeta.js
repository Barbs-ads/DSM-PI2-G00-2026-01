const { supabase, getSupabaseAutenticado } = require('../config/supabase');

class PontoColeta {
  // ═══ LISTAR PONTOS ATIVOS (Público) ═══
  static async buscarTodos() {
    try {
      const { data, error } = await supabase
        .from('pontos_coleta')
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (erro) {
      console.error('❌ Erro ao buscar pontos de coleta:', erro.message);
      throw erro;
    }
  }

  // ═══ CADASTRAR PONTO (Admin) ═══
  static async criar(dados, token) {
    try {
      const client = getSupabaseAutenticado(token);
      const { data, error } = await client
        .from('pontos_coleta')
        .insert({
          nome:        dados.nome,
          endereco:    dados.endereco,
          bairro:      dados.bairro,
          cidade:      dados.cidade,
          uf:          dados.uf,
          telefone:    dados.telefone || null,
          responsavel: dados.responsavel || null,
          horario:     dados.horario || null,
        })
        .select();

      if (error) throw error;
      return data[0];
    } catch (erro) {
      throw erro;
    }
  }

  // ═══ ATUALIZAR PONTO (Admin) ═══
  static async atualizar(id, dados, token) {
    try {
      const client = getSupabaseAutenticado(token);
      const campos = {};
      ['nome','endereco','bairro','cidade','uf','telefone','responsavel','horario'].forEach(k => {
        if (dados[k] !== undefined) campos[k] = dados[k];
      });
      const { data, error } = await client
        .from('pontos_coleta')
        .update(campos)
        .eq('id', id)
        .select();
      if (error) throw error;
      return data[0];
    } catch (erro) {
      throw erro;
    }
  }

  // ═══ DESATIVAR PONTO (soft-delete, Admin) ═══
  static async desativar(id, token) {
    try {
      const client = getSupabaseAutenticado(token);
      const { data, error } = await client
        .from('pontos_coleta')
        .update({ ativo: false })
        .eq('id', id)
        .select();
      if (error) throw error;
      return data[0];
    } catch (erro) {
      throw erro;
    }
  }
}

module.exports = PontoColeta;