const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
let supabaseUrl = '';
let supabaseKey = '';

envFile.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Buscando plano de contas para impostos...");
  const { data: planos, error: errPlanos } = await supabase
    .from('plano_de_contas')
    .select('*')
    .ilike('nome', '%imposto%');

  let targetId = null;

  if (planos && planos.length > 0) {
    targetId = planos[0].id;
    console.log("Plano de imposto encontrado:", planos[0]);
  } else {
    console.log("Nenhum plano de imposto encontrado. Buscando taxas...");
    const { data: planosTaxas } = await supabase
      .from('plano_de_contas')
      .select('*')
      .ilike('nome', '%taxa%');
    
    if (planosTaxas && planosTaxas.length > 0) {
      targetId = planosTaxas[0].id;
      console.log("Plano de taxa encontrado:", planosTaxas[0]);
    } else {
      console.log("Nenhum plano encontrado. Criando novo plano de contas: Impostos e Taxas...");
      const { data: novo, error: errNovo } = await supabase
        .from('plano_de_contas')
        .insert({
          codigo: '1.01.007',
          nome: 'Impostos e Taxas',
          tipo: 'despesa'
        })
        .select('id')
        .single();
        
      if (errNovo) {
        console.error("Erro ao criar plano:", errNovo);
        return;
      }
      targetId = novo.id;
      console.log("Criado com sucesso:", novo);
    }
  }
  
  if (targetId) {
    await atualizarGNREs(targetId);
  }
}

async function atualizarGNREs(planoId) {
  console.log(`Atualizando contas GNRE para usar o plano_conta_id: ${planoId}`);
  
  const { data, error } = await supabase
    .from('contas_a_pagar')
    .update({ plano_conta_id: planoId })
    .ilike('descricao', '%GNRE%')
    .select('id, descricao, plano_conta_id');
    
  if (error) {
    console.error("Erro ao atualizar GNREs:", error);
  } else {
    console.log(`Atualizadas ${data.length} contas GNRE.`);
  }
}

run();
