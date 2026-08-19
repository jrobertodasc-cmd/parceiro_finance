'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ContaComFornecedor = {
  id: string
  descricao: string
  valor: number
  vencimento: string
  status: string
  fornecedores: { nome: string } | null
}

export async function getContas(): Promise<ContaComFornecedor[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
   .from('contas_a_pagar')
   .select('id, descricao, valor, vencimento, status, fornecedores!contas_a_pagar_fornecedor_id_fkey(nome)')
   .order('vencimento', { ascending: true })

  if (error) {
    console.error('[getContas]', error.message)
    return []
  }
  return (data ?? []) as unknown as ContaComFornecedor[]
}

export async function getFornecedores(): Promise<{ id: string; nome: string }[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
   .from('fornecedores')
   .select('id, nome')
   .order('nome')

  if (error) {
    console.error('[getFornecedores]', error.message)
    return []
  }
  return data?? []
}

export async function criarConta(formData: FormData) {
  const supabase = await createClient()

  const nomeFornecedor = (formData.get('fornecedor') as string)?.trim()
  const descricao = (formData.get('descricao') as string)?.trim()
  const valor = parseFloat(formData.get('valor') as string)
  const vencimento = formData.get('vencimento') as string

  if (!nomeFornecedor ||!descricao || isNaN(valor) ||!vencimento) {
    throw new Error('Todos os campos sao obrigatorios.')
  }

  let fornecedorId: string
  const { data: existing } = await supabase
   .from('fornecedores')
   .select('id')
   .eq('nome', nomeFornecedor)
   .maybeSingle()

  if (existing) {
    fornecedorId = existing.id
  } else {
    const { data: novo, error: errForn } = await supabase
     .from('fornecedores')
     .insert({ nome: nomeFornecedor })
     .select('id')
     .single()
    if (errForn ||!novo) throw new Error('Erro ao criar fornecedor: ' + errForn?.message)
    fornecedorId = novo.id
  }

  const { error } = await supabase.from('contas_a_pagar').insert({
    fornecedor_id: fornecedorId,
    descricao,
    valor,
    vencimento,
    status: 'pendente',
  })

  if (error) throw new Error('Erro ao criar conta: ' + error.message)

  revalidatePath('/contas')
  revalidatePath('/dashboard')
}

export async function pagarConta(id: string) {
  const supabase = await createClient()
  await supabase.from('contas_a_pagar').update({ status: 'pago' }).eq('id', id)
  revalidatePath('/contas')
  revalidatePath('/dashboard')
}

export async function deletarConta(id: string) {
  const supabase = await createClient()
  await supabase.from('contas_a_pagar').delete().eq('id', id)
  revalidatePath('/contas')
  revalidatePath('/dashboard')
}

export async function editarConta(formData: FormData) {
  const supabase = await createClient()

  const id = formData.get('id') as string
  const nomeFornecedor = (formData.get('fornecedor') as string)?.trim()
  const descricao = (formData.get('descricao') as string)?.trim()
  const valor = parseFloat(formData.get('valor') as string)
  const vencimento = formData.get('vencimento') as string

  if (!id ||!nomeFornecedor ||!descricao || isNaN(valor) ||!vencimento) {
    throw new Error('Todos os campos são obrigatórios')
  }

  let fornecedorId: string
  const { data: existing } = await supabase.from('fornecedores').select('id').eq('nome', nomeFornecedor).maybeSingle()

  if (existing) {
    fornecedorId = existing.id
  } else {
    const { data: novo } = await supabase.from('fornecedores').insert({ nome: nomeFornecedor }).select('id').single()
    if (!novo) throw new Error('Erro ao criar fornecedor')
    fornecedorId = novo.id
  }

  const { error } = await supabase.from('contas_a_pagar').update({
    fornecedor_id: fornecedorId,
    descricao,
    valor,
    vencimento
  }).eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/contas')
  revalidatePath('/dashboard')
}

export async function getResumoContas() {
  const contas = await getContas()
  const hoje = new Date().toISOString().split('T')[0]

  const pendentes = contas.filter(c => c.status === 'pendente')
  const pagas = contas.filter(c => c.status === 'pago')
  const vencidas = contas.filter(c => c.status === 'pendente' && c.vencimento < hoje)

  const totalPendente = pendentes.reduce((acc, c) => acc + Number(c.valor), 0)
  const totalPago = pagas.reduce((acc, c) => acc + Number(c.valor), 0)

  return {
    totalPendente,
    totalPago,
    qtdPendente: pendentes.length,
    qtdPaga: pagas.length,
    qtdVencida: vencidas.length,
    total: contas.length
  }
}