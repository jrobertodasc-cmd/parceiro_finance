"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { UploadCloud, CheckCircle2, ArrowDownRight, ArrowUpRight, Search, FileUp, Trash2, AlertTriangle, Plus } from "lucide-react"
import Link from "next/link"
import { formatBRL } from "@/lib/format"

type Extrato = {
  id: string
  banco_nome: string | null
  data_transacao: string
  descricao: string
  valor: number
  tipo: 'debito' | 'credito'
  conciliado: boolean
  conta_pagar_id: string | null
  hash_unico: string
}

type ContaPagar = {
  id: string
  descricao: string
  valor: number
  vencimento: string
  status: string
  fornecedores?: { nome: string } | null
  plano_de_contas?: { codigo: string, nome: string } | null
}

export default function ConciliacaoPage() {
  const supabase = createClient()
  const [extratos, setExtratos] = useState<Extrato[]>([])
  const [contas, setContas] = useState<ContaPagar[]>([])
  
  const [loading, setLoading] = useState(true)
  const [importando, setImportando] = useState(false)
  const [filtro, setFiltro] = useState<'todos' | 'pendentes' | 'conciliados'>('pendentes')
  const [busca, setBusca] = useState("")

  const carregar = async () => {
    setLoading(true)
    
    const [resExtratos, resContas] = await Promise.all([
      supabase
        .from('extratos_bancarios')
        .select('*')
        .order('data_transacao', { ascending: false }),
      supabase
        .from('contas_a_pagar')
        .select(`
          *,
          fornecedores!contas_a_pagar_fornecedor_id_fkey (nome),
          plano_de_contas!contas_a_pagar_plano_conta_id_fkey (codigo,nome)
        `)
        .eq('status', 'pendente')
        .order('vencimento')
    ])

    if (resExtratos.data) setExtratos(resExtratos.data as Extrato[])
    if (resContas.data) setContas(resContas.data as ContaPagar[])
    
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  const parseOFX = (text: string) => {
    const transacoes: any[] = []
    const bankMatch = text.match(/<BANKID>([^<]+)/) || text.match(/<ORG>([^<]+)/)
    const bancoNome = bankMatch ? bankMatch[1].trim() : 'Banco Importado'
    
    const blocos = text.split('<STMTTRN>')
    
    for (let i = 1; i < blocos.length; i++) {
      const bloco = blocos[i]
      const dataMatch = bloco.match(/<DTPOSTED>([^<]+)/)
      const valorMatch = bloco.match(/<TRNAMT>([^<]+)/)
      const memoMatch = bloco.match(/<MEMO>([^<]+)/) || bloco.match(/<NAME>([^<]+)/)
      const fitidMatch = bloco.match(/<FITID>([^<]+)/)
      
      if (dataMatch && valorMatch) {
        const dataRaw = dataMatch[1].substring(0, 8)
        const dataFormatada = `${dataRaw.substring(0, 4)}-${dataRaw.substring(4, 6)}-${dataRaw.substring(6, 8)}`
        const valor = parseFloat(valorMatch[1].replace(',', '.'))
        
        const fitid = fitidMatch ? fitidMatch[1].trim() : `${dataFormatada}-${valorMatch[1]}-${Math.random().toString(36).substring(7)}`
        
        transacoes.push({
          banco_nome: bancoNome,
          data_transacao: dataFormatada,
          descricao: memoMatch ? memoMatch[1].trim().substring(0, 100) : 'Sem descrição',
          valor: Math.abs(valor),
          tipo: valor < 0 ? 'debito' : 'credito',
          conciliado: false,
          hash_unico: fitid
        })
      }
    }
    return transacoes
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setImportando(true)
    try {
      const text = await file.text()
      const transacoes = parseOFX(text)
      
      if (transacoes.length === 0) {
        alert("Nenhuma transação encontrada no arquivo OFX.")
        setImportando(false)
        return
      }

      let inseridos = 0
      let ignorados = 0

      for (const t of transacoes) {
        const { error } = await supabase.from('extratos_bancarios').insert([t])
        if (error) {
          if (error.code === '23505') {
            ignorados++
          } else {
            console.error("Erro ao inserir transação:", error)
          }
        } else {
          inseridos++
        }
      }

      alert(`Importação concluída!\n${inseridos} transações importadas.\n${ignorados} transações ignoradas (já existiam).`)
      await carregar()
    } catch (err) {
      console.error(err)
      alert("Erro ao ler o arquivo OFX.")
    } finally {
      setImportando(false)
      e.target.value = ''
    }
  }

  const encontrarContaCompativel = (extrato: Extrato) => {
    const contasPendentes = contas.filter(c => c.status === 'pendente')
    console.log('Procurando match para:', extrato.valor, extrato.data_transacao, 'contas:', contasPendentes.length)
    
    const valorExtrato = Math.abs(Number(String(extrato.valor).replace(',', '.')))
    
    return contasPendentes.find(conta => {
      const valorConta = Math.abs(Number(String(conta.valor).replace(',', '.')))
      const igual = Math.abs(valorConta - valorExtrato) < 0.05
      console.log(`Comparando conta ${conta.descricao} ${valorConta} vs extrato ${valorExtrato} => ${igual}`)
      return igual
    }) || null
  }

  const sugerirPlano = (descricao: string) => {
    const desc = descricao.toUpperCase()
    if (desc.includes("SEFAZ") || desc.includes("GNRE") || desc.includes("DARE")) return "1.01.007"
    if (desc.includes("SISPAG SALARIOS") || desc.includes("PIX ENVIADO")) return "1.01.001"
    if (desc.includes("BOLETO PAGO ANANDA") || desc.includes("THALIA") || desc.includes("ATACADAO")) return "1.01.002"
    return null
  }

  const handleConciliar = async (extratoId: string, contaId: string) => {
    if (!contaId) {
      alert("Selecione uma conta para vincular.")
      return
    }

    const extrato = extratos.find(e => e.id === extratoId)
    const conta = contas.find(c => c.id === contaId)

    if (!extrato || !conta) {
      alert("Erro ao localizar registros na memória.")
      return
    }

    // BLOQUEIOS DE DUPLICAÇÃO E ERRO CRÍTICO
    if (extrato.conciliado === true) {
      alert("Este extrato já foi conciliado.")
      return
    }
    if (conta.status !== 'pendente') {
      alert("Esta conta já foi paga ou está vinculada a outro extrato.")
      return
    }

    // Identifica o extrato para ver se tem plano de contas sugerido
    const codigoPlano = sugerirPlano(extrato.descricao)
    if (codigoPlano) {
      // Busca o ID do plano baseado no código
      const { data: plano } = await supabase.from('plano_de_contas').select('id').eq('codigo', codigoPlano).single()
      if (plano) {
        await supabase.from('contas_a_pagar').update({ plano_conta_id: plano.id }).eq('id', contaId)
      }
    }

    // 1. Marca extrato como conciliado e associa a conta
    const { error: errExtrato } = await supabase
      .from('extratos_bancarios')
      .update({ conciliado: true, conta_pagar_id: contaId })
      .eq('id', extratoId)

    if (errExtrato) {
      alert("Erro ao conciliar extrato: " + errExtrato.message)
      return
    }

    // 2. Marca a conta como paga
    const { error: errConta } = await supabase
      .from('contas_a_pagar')
      .update({ status: 'pago' })
      .eq('id', contaId)

    if (errConta) {
      alert("Erro ao atualizar status da conta: " + errConta.message)
      return
    }

    // Atualiza as listas na hora sem dar refresh total
    setExtratos(prev => prev.map(e => e.id === extratoId ? { ...e, conciliado: true, conta_pagar_id: contaId } : e))
    setContas(prev => prev.filter(c => c.id !== contaId))
    
    alert("Conciliado com sucesso!")
  }

  const desconciliar = async (extratoId: string) => {
    const extrato = extratos.find(e => e.id === extratoId)
    if (!extrato) return

    const { error: errExtrato } = await supabase
      .from('extratos_bancarios')
      .update({ conciliado: false, conta_pagar_id: null })
      .eq('id', extratoId)

    if (errExtrato) {
      alert("Erro ao desconciliar: " + errExtrato.message)
      return
    }

    if (extrato.conta_pagar_id) {
      const { error: errConta } = await supabase
        .from('contas_a_pagar')
        .update({ status: 'pendente' })
        .eq('id', extrato.conta_pagar_id)
        
      if (errConta) console.error("Erro ao voltar conta", errConta)
    }

    await carregar()
  }

  const extratosFiltrados = extratos.filter(e => {
    if (filtro === 'pendentes' && e.conciliado) return false
    if (filtro === 'conciliados' && !e.conciliado) return false
    if (busca) {
      const termo = busca.toLowerCase()
      return e.descricao.toLowerCase().includes(termo) || e.valor.toString().includes(termo)
    }
    return true
  })

  const totalDebito = extratos.filter(e => e.tipo === 'debito' && !e.conciliado).reduce((a, b) => a + Number(b.valor), 0)
  const totalCredito = extratos.filter(e => e.tipo === 'credito' && !e.conciliado).reduce((a, b) => a + Number(b.valor), 0)
  const totalAConciliar = extratos.filter(e => !e.conciliado).length

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Conciliação Bancária</h1>
          <p className="text-white/50 mt-1">Importe seu extrato e vincule aos pagamentos/recebimentos de forma inteligente.</p>
        </div>
        
        <label className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-xl font-bold cursor-pointer transition-colors ${importando ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <FileUp size={20} />
          {importando ? 'Importando...' : 'Importar OFX'}
          <input 
            type="file" 
            accept=".ofx,.txt,.qfx" 
            className="hidden" 
            onChange={handleUpload} 
            disabled={importando} 
          />
        </label>
      </div>

      {/* KPIS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#151F32] border border-white/10 p-5 rounded-2xl">
          <p className="text-white/50 text-sm flex items-center gap-2">Débitos Pendentes</p>
          <p className="text-2xl font-bold text-red-400 mt-2">{formatBRL(totalDebito)}</p>
          <p className="text-xs text-white/30 mt-1">Saídas aguardando conciliação</p>
        </div>
        <div className="bg-[#151F32] border border-white/10 p-5 rounded-2xl">
          <p className="text-white/50 text-sm">Créditos Pendentes</p>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{formatBRL(totalCredito)}</p>
          <p className="text-xs text-white/30 mt-1">Entradas aguardando conciliação</p>
        </div>
        <div className="bg-[#151F32] border border-white/10 p-5 rounded-2xl">
          <p className="text-white/50 text-sm">Total a Conciliar</p>
          <p className="text-2xl font-bold text-white mt-2">{totalAConciliar}</p>
          <p className="text-xs text-white/30 mt-1">Transações pendentes</p>
        </div>
      </div>

      {/* CONTROLES */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 bg-[#151F32] border border-white/10 p-4 rounded-2xl">
        <div className="flex bg-[#0B1120] border border-white/10 rounded-lg p-1">
          <button 
            onClick={() => setFiltro('todos')} 
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${filtro === 'todos' ? 'bg-[#1E293B] text-white shadow-sm' : 'text-white/50 hover:text-white'}`}
          >
            Todos
          </button>
          <button 
            onClick={() => setFiltro('pendentes')} 
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${filtro === 'pendentes' ? 'bg-[#1E293B] text-white shadow-sm' : 'text-white/50 hover:text-white'}`}
          >
            Pendentes
          </button>
          <button 
            onClick={() => setFiltro('conciliados')} 
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${filtro === 'conciliados' ? 'bg-[#1E293B] text-white shadow-sm' : 'text-white/50 hover:text-white'}`}
          >
            Conciliados
          </button>
        </div>

        <div className="flex items-center bg-[#0B1120] border border-white/10 rounded-lg px-3 py-2 w-full sm:w-80">
          <Search size={16} className="text-white/30 mr-2" />
          <input 
            placeholder="Buscar transação..." 
            className="bg-transparent outline-none text-sm w-full placeholder:text-white/30 text-white"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      {/* LISTA */}
      <div className="bg-[#151F32] rounded-2xl border border-white/10 overflow-hidden shadow-lg">
        <div className="grid grid-cols-12 p-4 text-xs text-white/40 uppercase tracking-widest border-b border-white/10 font-bold bg-[#0F172A]/50">
          <div className="col-span-2">Data</div>
          <div className="col-span-4">Descrição do Banco</div>
          <div className="col-span-2">Valor</div>
          <div className="col-span-4">Ação / Vínculo</div>
        </div>
        
        <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto custom-scroll">
          {loading ? (
             <div className="p-12 text-center text-white/50">Carregando extratos...</div>
          ) : extratosFiltrados.length === 0 ? (
            <div className="p-12 text-center text-white/40 flex flex-col items-center">
              <UploadCloud size={48} className="mb-4 opacity-20" />
              <p>Nenhuma transação encontrada.</p>
              <p className="text-sm mt-2">Importe um arquivo OFX gerado pelo seu banco.</p>
            </div>
          ) : (
            extratosFiltrados.map(ex => {
              const compativel = !ex.conciliado ? encontrarContaCompativel(ex) : null

              return (
                <div key={ex.id} className={`grid grid-cols-12 p-4 items-start md:items-center transition-colors hover:bg-white/[0.02] gap-3 md:gap-0 ${ex.conciliado ? 'opacity-50 hover:opacity-100' : ''}`}>
                  <div className="col-span-12 md:col-span-2 text-sm font-mono text-white/70">
                    {new Date(ex.data_transacao + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </div>
                  
                  <div className="col-span-12 md:col-span-4 pr-4 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${ex.tipo === 'debito' ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                      {ex.tipo === 'debito' ? <ArrowDownRight size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                    <div>
                      <p className="font-medium text-sm truncate max-w-[250px]">{ex.descricao}</p>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider">{ex.banco_nome}</p>
                    </div>
                  </div>
                  
                  <div className={`col-span-12 md:col-span-2 font-bold font-mono text-sm ${ex.tipo === 'debito' ? 'text-red-400' : 'text-emerald-400'}`}>
                    {ex.tipo === 'debito' ? '-' : '+'} {formatBRL(Math.abs(Number(ex.valor)))}
                  </div>
                  
                  <div className="col-span-12 md:col-span-4 w-full">
                    {ex.conciliado ? (
                      <button 
                        onClick={() => desconciliar(ex.id)} 
                        className="flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 px-3 py-2 rounded-lg text-xs font-bold w-full transition-all group"
                      >
                        <CheckCircle2 size={14} className="group-hover:hidden" />
                        <Trash2 size={14} className="hidden group-hover:block" />
                        <span className="group-hover:hidden">Conciliado</span>
                        <span className="hidden group-hover:block">Desfazer Vínculo</span>
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2 w-full">
                        {compativel ? (
                          <>
                            <div className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 text-[10px] px-2 py-1 rounded w-fit flex items-center gap-1 font-bold">
                              <CheckCircle2 size={12} />
                              Encontrado: {compativel.descricao}
                            </div>
                            <div className="flex gap-2">
                              <select 
                                className="w-full bg-[#0B1120] border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 outline-none"
                                defaultValue={compativel.id}
                                id={`select-${ex.id}`}
                              >
                                {contas.map(c => (
                                  <option key={c.id} value={c.id}>{formatBRL(c.valor)} - {c.descricao}</option>
                                ))}
                              </select>
                              <button 
                                onClick={() => {
                                  const selectEl = document.getElementById(`select-${ex.id}`) as HTMLSelectElement
                                  if (selectEl.value) {
                                    handleConciliar(ex.id, selectEl.value)
                                  }
                                }}
                                className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors flex shrink-0 items-center justify-center"
                                title="Confirmar Conciliação"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-amber-400 bg-amber-500/10 border border-amber-500/20 text-[10px] px-2 py-1 rounded w-fit flex items-center gap-1 font-bold">
                              <AlertTriangle size={12} />
                              Sem correspondência - Criar em Contas
                            </div>
                            <div className="flex gap-2">
                              <select 
                                className="w-full bg-[#0B1120] border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 outline-none"
                                defaultValue=""
                                id={`select-${ex.id}`}
                              >
                                <option value="">Ou selecione manualmente...</option>
                                {contas.map(c => (
                                  <option key={c.id} value={c.id}>{formatBRL(c.valor)} - {c.descricao}</option>
                                ))}
                              </select>
                              <Link 
                                href="/contas" 
                                className="bg-[#1E293B] hover:bg-[#334155] text-white px-3 py-2 rounded-lg transition-colors flex shrink-0 items-center justify-center text-xs font-bold gap-1 border border-white/10"
                              >
                                <Plus size={14} /> Criar Conta
                              </Link>
                              <button 
                                onClick={() => {
                                  const selectEl = document.getElementById(`select-${ex.id}`) as HTMLSelectElement
                                  if (selectEl.value) {
                                    handleConciliar(ex.id, selectEl.value)
                                  } else {
                                    alert("Selecione uma conta para vincular.")
                                  }
                                }}
                                className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors flex shrink-0 items-center justify-center"
                                title="Confirmar Vinculo Manual"
                              >
                                <CheckCircle2 size={16} />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}