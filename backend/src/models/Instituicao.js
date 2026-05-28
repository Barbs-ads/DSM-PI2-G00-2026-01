const { supabase, getSupabaseAutenticado } = require('../config/supabase');

class Instituicao {
  //LISTAR INSTITUIÇÕES VERIFICADAS
  static async buscarTodasAprovadas() {
    try {
      const { data, error } = await supabase
        .from('instituicoes')
        .select('id, nome, tipo, cidade, uf')
        .eq('verificada', true);

      if (error) throw error;
      return data || [];
    } catch (erro) {
      console.error('❌ Erro ao buscar instituições:', erro.message);
      throw erro;
    }
  }

  // LISTAR TODAS INSTITUIÇÕES 
  static async buscarTodas(token) {
    try {
      const client = getSupabaseAutenticado(token);
      const { data, error } = await client
        .from('instituicoes')
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (erro) {
      throw erro;
    }
  }

  //APROVAR UMA INSTITUIÇÃO
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
}

module.exports = Instituicao;
