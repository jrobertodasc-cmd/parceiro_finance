"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Plus, Pencil, Trash2, Search, CheckCircle, Clock, AlertTriangle } from "lucide-react"

type ContaPagar = {
  id: string
  descricao: string
  valor: number
  vencimento: string
  status: 'pendente' | 'pago' | 'vencido'
  fornecedor_id: string | null
  plano_conta_id: string | null
  fornecedores?: { nome: string } | null
  plano_de_contas?: { codigo: string, nome: string } | null
}

type Fornecedor = { id: string, nome: string }
type PlanoConta = { id: string, codigo: string, nome: string }

export default function ContasPage() {
  const supabase = createClient()
  const [contas, setContas] = useState<ContaPagar[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [planoContas, setPlanoContas] = useState<PlanoConta[]>([])
  const [loading, setLoading] = useState(true)
  
  const [form, setForm] = useState({
    descricao: '',
    valor: '',
    vencimento: '',
    fornecedor_id: '',
    plano_conta_id: '',
    status: 'pendente' as const
  })
  const [editando, setEditando] = useState<string | null>(null)
  
  const [filtro, setFiltro] = useState<'todos' | 'pendente' | 'pago' | 'vencido'>('todos')
  const [busca, setBusca] = useState("")

  const carregarContas = async () => {
    setLoading(true)
    
    const [resContas, resForn, resPlano] = await Promise.all([
      supabase
        .from('contas_a_pagar')
        .select(`
          *,
          fornecedores!contas_a_pagar_fornecedor_id_fkey (nome),
          plano_de_contas!contas_a_pagar_plano_conta_id_fkey (codigo,nome)
        `)
        .order('vencimento', { ascending: false }),
      supabase.from('fornecedores').select('id, nome').order('nome'),
      supabase.from('plano_de_contas').select('id, codigo, nome').order('codigo')
    ])

    if (resContas.data) setContas(resContas.data as any)
    if (resForn.data) setFornecedores(resForn.data)
    if (resPlano.data) setPlanoContas(resPlano.data)
    
    setLoading(false)
  }

  useEffect(() => {
    carregarContas()
  }, [])

  const handleAdicionar = async () => {
    try {
      // CONVERTE vírgula pra ponto
      const valorStr = String(form.valor)
      const valorNumerico = parseFloat(valorStr.replace(',', '.').replace('R$', '').trim())
      
      console.log('Tentando inserir:', { 
        descricao: form.descricao, 
        valorNumerico, 
        vencimento: form.vencimento, 
        fornecedor_id: form.fornecedor_id, 
        plano_conta_id: form.plano_conta_id 
      })

      if (isNaN(valorNumerico)) { 
        alert('Valor inválido')
        return 
      }

      const payload = {
        descricao: form.descricao.trim(),
        valor: valorNumerico,
        vencimento: form.vencimento, // yyyy-mm-dd
        status: form.status || 'pendente',
        fornecedor_id: form.fornecedor_id && form.fornecedor_id !== '' ? form.fornecedor_id : null,
        plano_conta_id: form.plano_conta_id && form.plano_conta_id !== '' ? form.plano_conta_id : null
      }

      if (editando) {
        const { data, error } = await supabase
          .from('contas_a_pagar')
          .update(payload)
          .eq('id', editando)
          .select(`
            *,
            fornecedores!contas_a_pagar_fornecedor_id_fkey (nome),
            plano_de_contas!contas_a_pagar_plano_conta_id_fkey (codigo,nome)
          `)
          
        if (error) {
          console.error('ERRO SUPABASE:', error)
          alert('Erro ao atualizar: ' + error.message)
          return
        }
        
        console.log('Atualizou:', data)
        setContas(prev => prev.map(c => c.id === editando ? (data[0] as any) : c))
        setForm({ descricao: '', valor: '', vencimento: '', fornecedor_id: '', plano_conta_id: '', status: 'pendente' })
        setEditando(null)
      } else {
        const { data, error } = await supabase
          .from('contas_a_pagar')
          .insert([payload])
          .select(`
            *,
            fornecedores!contas_a_pagar_fornecedor_id_fkey (nome),
            plano_de_contas!contas_a_pagar_plano_conta_id_fkey (codigo,nome)
          `)

        if (error) {
          console.error('ERRO SUPABASE:', error)
          alert('Erro ao salvar: ' + error.message)
          return
        }

        console.log('Salvou:', data)
        setContas(prev => [data[0] as any, ...prev])
        // limpa form
        setForm({ descricao: '', valor: '', vencimento: '', fornecedor_id: '', plano_conta_id: '', status: 'pendente' })
      }
    } catch (e: any) {
      console.error(e)
      alert(e.message)
    }
  }

  const editar = (conta: ContaPagar) => {
    setForm({
      descricao: conta.descricao,
      valor: conta.valor.toString(),
      vencimento: conta.vencimento,
      fornecedor_id: conta.fornecedor_id || '',
      plano_conta_id: conta.plano_conta_id || '',
      status: conta.status
    })
    setEditando(conta.id)
  }

  const excluir = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta conta?")) return
    const { error } = await supabase.from('contas_a_pagar').delete().eq('id', id)
    if (error) alert("Erro ao excluir: " + error.message)
    else setContas(prev => prev.filter(c => c.id !== id))
  }

  const formatCurrency = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
  }

  // Lógica de Filtro
  const hoje = new Date().toISOString().split('T')[0]

  const contasFiltradas = contas.filter(c => {
    let statusReal = c.status
    if (statusReal === 'pendente' && c.vencimento < hoje) {
      statusReal = 'vencido'
    }

    if (filtro !== 'todos' && statusReal !== filtro) return false
    
    if (busca) {
      const termo = busca.toLowerCase()
      const fornecedor = c.fornecedores?.nome?.toLowerCase() || ''
      const plano = c.plano_de_contas?.nome?.toLowerCase() || ''
      return (
        c.descricao.toLowerCase().includes(termo) || 
        fornecedor.includes(termo) || 
        plano.includes(termo) ||
        c.valor.toString().includes(termo)
      )
    }
    
    return true
  })

  // Quantidades para as Pills
  const qtdPendentes = contas.filter(c => c.status === 'pendente' && c.vencimento >= hoje).length
  const qtdPagas = contas.filter(c => c.status === 'pago').length
  const qtdVencidas = contas.filter(c => c.status === 'vencido' || (c.status === 'pendente' && c.vencimento < hoje)).length

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Contas a Pagar</h1>
          <p className="text-white/50 mt-1">Gerencie suas obrigações financeiras e pagamentos.</p>
        </div>
      </div>

      {/* FORMULÁRIO */}
      <div className="bg-[#151F32] p-6 rounded-xl border border-white/10 shadow-lg">
        <h2 className="text-lg font-semibold mb-4">{editando ? 'Editar Conta' : 'Nova Conta'}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <input
            type="text"
            className="bg-[#0B1120] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 placeholder:text-white/30"
            placeholder="Descrição (Ex: Aluguel Escritório)"
            value={form.descricao}
            onChange={e => setForm({ ...form, descricao: e.target.value })}
          />
          <input
            type="text"
            className="bg-[#0B1120] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 placeholder:text-white/30"
            placeholder="Valor (R$)"
            value={form.valor}
            onChange={e => setForm({ ...form, valor: e.target.value })}
          />
          <input
            type="date"
            className="bg-[#0B1120] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 text-white/70"
            value={form.vencimento}
            onChange={e => setForm({ ...form, vencimento: e.target.value })}
          />
          <select
            className="bg-[#0B1120] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 text-white/70"
            value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value as any })}
          >
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
            <option value="vencido">Vencido</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <select
            className="bg-[#0B1120] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 text-white/70"
            value={form.fornecedor_id}
            onChange={e => setForm({ ...form, fornecedor_id: e.target.value })}
          >
            <option value="">Selecione um Fornecedor...</option>
            {fornecedores.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
          </select>

          <select
            className="bg-[#0B1120] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500 text-white/70"
            value={form.plano_conta_id}
            onChange={e => setForm({ ...form, plano_conta_id: e.target.value })}
          >
            <option value="">Selecione o Plano de Contas...</option>
            {planoContas.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.nome}</option>)}
          </select>

          <div className="flex gap-2">
            <button
              onClick={handleAdicionar}
              className="flex-1 bg-blue-600 hover:bg-blue-500 px-6 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
            >
              {editando ? 'Atualizar' : <><Plus size={18} /> Adicionar</>}
            </button>
            {editando && (
              <button
                onClick={() => { setEditando(null); setForm({ descricao: '', valor: '', vencimento: '', fornecedor_id: '', plano_conta_id: '', status: 'pendente' }) }}
                className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 bg-[#151F32] border border-white/10 p-4 rounded-xl shadow-lg">
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setFiltro('todos')} 
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${filtro === 'todos' ? 'bg-[#1E293B] text-white border-white/20' : 'bg-[#0B1120] text-white/50 border-white/5 hover:text-white'}`}
          >
            Todas ({contas.length})
          </button>
          <button 
            onClick={() => setFiltro('pendente')} 
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${filtro === 'pendente' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-[#0B1120] text-white/50 border-white/5 hover:text-amber-400'}`}
          >
            <Clock size={14} /> Pendentes ({qtdPendentes})
          </button>
          <button 
            onClick={() => setFiltro('pago')} 
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${filtro === 'pago' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-[#0B1120] text-white/50 border-white/5 hover:text-emerald-400'}`}
          >
            <CheckCircle size={14} /> Pagas ({qtdPagas})
          </button>
          <button 
            onClick={() => setFiltro('vencido')} 
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${filtro === 'vencido' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-[#0B1120] text-white/50 border-white/5 hover:text-red-400'}`}
          >
            <AlertTriangle size={14} /> Vencidas ({qtdVencidas})
          </button>
        </div>

        <div className="flex items-center bg-[#0B1120] border border-white/10 rounded-lg px-3 py-2 w-full sm:w-80">
          <Search size={16} className="text-white/30 mr-2" />
          <input 
            placeholder="Buscar por descrição, fornecedor..." 
            className="bg-transparent outline-none text-sm w-full placeholder:text-white/30"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
      </div>

      {/* LISTAGEM */}
      <div className="bg-[#151F32] rounded-xl border border-white/10 overflow-hidden shadow-lg">
        <div className="grid grid-cols-12 p-4 text-xs text-white/40 uppercase tracking-widest border-b border-white/10 font-bold bg-[#0F172A]/50 hidden md:grid">
          <div className="col-span-1">Vencimento</div>
          <div className="col-span-3">Descrição</div>
          <div className="col-span-2">Fornecedor</div>
          <div className="col-span-2">Categoria</div>
          <div className="col-span-2">Valor</div>
          <div className="col-span-2 text-right">Ações</div>
        </div>
        
        <div className="divide-y divide-white/5">
          {loading ? (
             <div className="p-12 text-center text-white/50">Carregando contas...</div>
          ) : contasFiltradas.length === 0 ? (
            <div className="p-12 text-center text-white/40">Nenhuma conta encontrada.</div>
          ) : (
            contasFiltradas.map(conta => {
              let status = conta.status
              if (status === 'pendente' && conta.vencimento < hoje) {
                status = 'vencido'
              }
              
              return (
                <div key={conta.id} className="flex flex-col md:grid md:grid-cols-12 p-4 items-start md:items-center transition-colors hover:bg-white/[0.02] gap-3 md:gap-0 group">
                  
                  <div className="col-span-1 flex items-center gap-2 w-full">
                    {status === 'vencido' && <AlertTriangle size={14} className="text-red-400 shrink-0 hidden md:block" />}
                    {status === 'pago' && <CheckCircle size={14} className="text-emerald-400 shrink-0 hidden md:block" />}
                    {status === 'pendente' && <Clock size={14} className="text-amber-400 shrink-0 hidden md:block" />}
                    <span className={`text-sm font-mono ${status === 'vencido' ? 'text-red-400' : 'text-white/70'}`}>
                      {new Date(conta.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  
                  <div className="col-span-3 pr-4 w-full">
                    <p className="font-medium text-sm truncate">{conta.descricao}</p>
                    {/* Badge de status no mobile */}
                    <span className={`inline-block md:hidden mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                      ${status === 'vencido' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : ''}
                      ${status === 'pago' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : ''}
                      ${status === 'pendente' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : ''}
                    `}>
                      {status}
                    </span>
                  </div>
                  
                  <div className="col-span-2 text-sm text-white/60 w-full truncate">
                    {conta.fornecedores?.nome || <span className="text-white/20 italic">Sem fornecedor</span>}
                  </div>
                  
                  <div className="col-span-2 w-full">
                    {conta.plano_de_contas ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-[#0B1120] border border-white/10 px-1.5 py-0.5 rounded text-white/50">{conta.plano_de_contas.codigo}</span>
                        <span className="text-xs text-white/60 truncate" title={conta.plano_de_contas.nome}>{conta.plano_de_contas.nome}</span>
                      </div>
                    ) : (
                      <span className="text-white/20 italic text-sm">Não classificado</span>
                    )}
                  </div>
                  
                  <div className="col-span-2 font-bold font-mono text-sm w-full">
                    {formatCurrency(conta.valor)}
                  </div>
                  
                  <div className="col-span-2 flex justify-start md:justify-end gap-2 w-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => editar(conta)} className="bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-sm transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => excluir(conta.id)} className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-sm transition-colors">
                      <Trash2 size={14} />
                    </button>
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