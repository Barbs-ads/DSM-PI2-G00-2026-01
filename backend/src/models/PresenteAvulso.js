const { supabase, getSupabaseAutenticado } = require('../config/supabase');

class PresenteAvulso {
  //LISTAR DOAÇÕES
  static async listarTodas(token) {
    try {
      const client = getSupabaseAutenticado(token);
      const { data, error } = await client
        .from('doacoes_diretas')   
        .select('*');

      if (error) throw error;
      return data || [];
    } catch (erro) {
      throw erro;
    }
  }

  // REGISTRAR DOAÇÃO DIRETA
  static async criar(dados, token) {
    try {
      const client = getSupabaseAutenticado(token);

      
      const { data: userData, error: userError } = await client
        .from('usuarios')
        .select('id')
        .single();

      if (userError) throw userError;

      const { data, error } = await client
        .from('doacoes_diretas')   
        .insert({
          doador_id:   userData.id,          
          observacoes: dados.descricao,      
          categoria_id: dados.categoria_id,
          ponto_id:    dados.ponto_id,
          status:      'recebida'            
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