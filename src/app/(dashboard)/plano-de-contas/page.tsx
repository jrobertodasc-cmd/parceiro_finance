"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Plus, Pencil, Trash2, Search } from "lucide-react"
import { useEmpresa } from "@/contexts/EmpresaContext"

type PlanoConta = {
  id: string
  codigo: string
  nome: string
  tipo: 'receita' | 'despesa' | 'custo'
  created_at: string
}

export default function PlanoDeContasPage() {
  const supabase = createClient()
  const { empresaAtual } = useEmpresa()
  const [contas, setContas] = useState<PlanoConta[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ codigo: '', nome: '', tipo: 'despesa' as const })
  const [editando, setEditando] = useState<string | null>(null)
  const [busca, setBusca] = useState("")

  const carregar = async () => {
    if (!empresaAtual) return
    setLoading(true)
    const { data, error } = await supabase
      .from('plano_de_contas')
      .select('*')
      .eq('empresa_id', empresaAtual.id)
      .order('codigo', { ascending: true })

    if (error) {
      console.error(error)
      alert("Erro ao carregar: " + error.message)
    } else {
      setContas(data as PlanoConta[])
    }
    setLoading(false)
  }

  useEffect(() => {
    carregar()
  }, [empresaAtual])

  const salvar = async () => {
    if (!form.codigo.trim() || !form.nome.trim()) {
      alert("Código e Nome são obrigatórios")
      return
    }

    if (editando) {
      const { error } = await supabase
        .from('plano_de_contas')
        .update({ codigo: form.codigo, nome: form.nome, tipo: form.tipo })
        .eq('id', editando)

      if (error) {
        alert("Erro ao atualizar: " + error.message)
      } else {
        setForm({ codigo: '', nome: '', tipo: 'despesa' })
        setEditando(null)
        carregar()
      }
    } else {
      const { error } = await supabase
        .from('plano_de_contas')
        .insert([{ codigo: form.codigo, nome: form.nome, tipo: form.tipo, empresa_id: empresaAtual?.id }])

      if (error) {
        alert("Erro ao salvar: " + error.message)
      } else {
        setForm({ codigo: '', nome: '', tipo: 'despesa' })
        carregar()
      }
    }
  }

  const editar = (conta: PlanoConta) => {
    setForm({ codigo: conta.codigo, nome: conta.nome, tipo: conta.tipo })
    setEditando(conta.id)
  }

  const excluir = async (id: string) => {
    if (!confirm("Excluir esta conta?")) return
    const { error } = await supabase.from('plano_de_contas').delete().eq('id', id)
    if (error) alert("Erro ao excluir: " + error.message)
    else carregar()
  }

  const cancelarEdicao = () => {
    setForm({ codigo: '', nome: '', tipo: 'despesa' })
    setEditando(null)
  }

  const contasFiltradas = contas.filter(c => 
    c.nome.toLowerCase().includes(busca.toLowerCase()) || 
    c.codigo.includes(busca)
  )

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Plano de Contas</h1>
          <p className="text-white/50 mt-1">Gerencie suas categorias financeiras para DRE e Conciliação</p>
        </div>
        <div className="bg-[#151F32] border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2">
          <span className="text-sm text-white/50">Total: </span>
          <span className="font-bold">{contas.length} contas</span>
        </div>
      </div>

      <div className="bg-[#151F32] p-6 rounded-xl border border-white/10 shadow-lg">
        <h2 className="text-lg font-semibold mb-4">{editando ? 'Editar Conta' : 'Nova Conta'}</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <input
            className="bg-[#0B1120] border border-white/10 rounded-lg px-4 py-3 w-full md:w-36 focus:outline-none focus:border-blue-500 placeholder:text-white/30"
            placeholder="Cód (1.01)"
            value={form.codigo}
            onChange={e => setForm({ ...form, codigo: e.target.value })}
          />
          <input
            className="bg-[#0B1120] border border-white/10 rounded-lg px-4 py-3 flex-1 focus:outline-none focus:border-blue-500 placeholder:text-white/30"
            placeholder="Nome da conta (ex: Energia Elétrica)"
            value={form.nome}
            onChange={e => setForm({ ...form, nome: e.target.value })}
          />
          <select
            className="bg-[#0B1120] border border-white/10 rounded-lg px-4 py-3 w-full md:w-40 focus:outline-none focus:border-blue-500"
            value={form.tipo}
            onChange={e => setForm({ ...form, tipo: e.target.value as any })}
          >
            <option value="despesa">Despesa</option>
            <option value="receita">Receita</option>
            <option value="custo">Custo</option>
          </select>
          <button
            onClick={salvar}
            className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
          >
            {editando ? 'Atualizar' : <><Plus size={18} /> Salvar</>}
          </button>
          {editando && (
            <button
              onClick={cancelarEdicao}
              className="bg-white/10 hover:bg-white/20 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      <div className="bg-[#151F32] rounded-xl border border-white/10 overflow-hidden shadow-lg">
        <div className="p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="font-semibold">Contas Cadastradas</h2>
          <div className="flex items-center bg-[#0B1120] border border-white/10 rounded-lg px-3 py-2 w-full sm:w-64">
            <Search size={16} className="text-white/30 mr-2" />
            <input 
              placeholder="Buscar por nome ou código..." 
              className="bg-transparent outline-none text-sm w-full placeholder:text-white/30"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        <div className="divide-y divide-white/5">
          {loading ? (
            <div className="p-10 text-center text-white/50">Carregando contas...</div>
          ) : contasFiltradas.length === 0 ? (
            <div className="p-10 text-center text-white/40">Nenhuma conta encontrada.</div>
          ) : (
            contasFiltradas.map(c => (
              <div key={c.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-center gap-4 flex-1">
                  <span className="text-white/40 font-mono text-sm bg-[#0B1120] border border-white/10 px-2.5 py-1 rounded-md min-w-16 text-center">{c.codigo}</span>
                  <span className="font-medium flex-1">{c.nome}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide
                    ${c.tipo === 'receita' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : ''}
                    ${c.tipo === 'despesa' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : ''}
                    ${c.tipo === 'custo' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : ''}
                  `}>
                    {c.tipo}
                  </span>
                </div>
                <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity mt-3 sm:mt-0 ml-0 sm:ml-4">
                  <button onClick={() => editar(c)} className="bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors">
                    <Pencil size={14} /> Editar
                  </button>
                  <button onClick={() => excluir(c.id)} className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 transition-colors">
                    <Trash2 size={14} /> Excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}