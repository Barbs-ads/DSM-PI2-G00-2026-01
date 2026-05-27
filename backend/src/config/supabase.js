const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Usuário não Autenticado (para consultas públicas)

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Usuário Autenticado (para ações do usuário logado)
const getSupabaseAutenticado = (token) => {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    }
  );
};

module.exports = { supabase, getSupabaseAutenticado };