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
          nome: dados.nome,
          endereco: dados.endereco,
          bairro: dados.bairro,
          cidade: dados.cidade,
          uf: dados.uf,
          telefone: dados.telefone
        })
        .select();

      if (error) throw error;
      return data[0];
    } catch (erro) {
      throw erro;
    }
  }
}

module.exports = PontoColeta;
