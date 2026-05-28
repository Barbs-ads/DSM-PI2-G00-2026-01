const { supabase, getSupabaseAutenticado } = require('../config/supabase');

class PresenteAvulso {
  //LISTAR DOAÇÕES
  static async listarTodas(token) {
    try {
      const client = getSupabaseAutenticado(token);
      const { data, error } = await client
        .from('presentes_avulsos')
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (erro) {
      throw erro;
    }
  }

  //REGISTRAR DOAÇÃO AVULSA
  static async criar(dados, token) {
    try {
      const client = getSupabaseAutenticado(token);
      const { data, error } = await client
        .from('presentes_avulsos')
        .insert({
          descricao: dados.descricao,
          categoria_id: dados.categoria_id,
          ponto_id: dados.ponto_id,
          status: 'recebido'
        })
        .select();

      if (error) throw error;
      return data[0];
    } catch (erro) {
      throw erro;
    }
  }
}

module.exports = PresenteAvulso;