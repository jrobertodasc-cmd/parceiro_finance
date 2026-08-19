"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useEmpresa } from "@/contexts/EmpresaContext"
import { formatBRL } from "@/lib/format"

type Conta = {
  id: string
  valor: number
  status: 'pendente' | 'pago' | 'vencido'
  fornecedores: { nome: string } | null
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"]

function GastosChart({ data }: { data: { name: string, value: number }[] }) {
  const total = data.reduce((acc, cur) => acc + cur.value, 0)
  if (total === 0) return <div className="h-64 flex items-center justify-center text-white/30">Sem dados</div>

  let acumulado = 0
  const gradient = data.map((item, i) => {
    const perc = (item.value / total) * 100
    const start = acumulado
    acumulado += perc
    return `${COLORS[i % COLORS.length]} ${start}% ${acumulado}%`
  }).join(', ')

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-8">
      <div className="w-64 h-64 rounded-full" style={{ background: `conic-gradient(${gradient})`, border: '4px solid #1E293B' }} />
      <div className="text-sm font-bold mt-4">
        {data[0]?.name} - {((data[0]?.value / total) * 100).toFixed(0)}%
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const supabase = createClient()
  const { empresaAtual } = useEmpresa()
  const [contas, setContas] = useState<Conta[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const carregar = async () => {
      if (!empresaAtual) return
      const { data } = await supabase
        .from('contas_a_pagar')
        .select('*, fornecedores!contas_a_pagar_fornecedor_id_fkey(nome)')
        .eq('empresa_id', empresaAtual.id)
      
      if (data) setContas(data as any)
      setLoading(false)
    }
    carregar()
  }, [empresaAtual])

  const totalPendente = contas.filter(c => c.status === 'pendente').reduce((a, b) => a + Number(b.valor), 0)
  const totalPago = contas.filter(c => c.status === 'pago').reduce((a, b) => a + Number(b.valor), 0)
  const vencidas = contas.filter(c => c.status === 'vencido').length
  const totalGeral = contas.length

  const gastosPorFornecedor = Object.values(
    contas.reduce((acc: any, curr) => {
      const nome = curr.fornecedores?.nome || 'Sem fornecedor'
      if (!acc[nome]) acc[nome] = { name: nome, value: 0 }
      acc[nome].value += Number(curr.valor)
      return acc
    }, {})
  ) as { name: string, value: number }[]

  if (loading) return <p className="p-8 text-white/50">Carregando empresas...</p>
  if (!empresaAtual) return <p className="p-8 text-white/50">Selecione uma empresa no topo. Se não aparecer, vá em Supabase &gt; Table Editor &gt; empresas e veja se tem 8 linhas.</p>

  return (
    <div className="p-6 md:p-8 space-y-6">
      <h1 className="text-3xl font-bold">Dashboard Financeiro</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#151F32] border border-white/10 p-5 rounded-2xl">
          <p className="text-white/50 text-sm flex items-center gap-2">Total Pendente</p>
          <p className="text-2xl font-bold text-amber-400 mt-2">{formatBRL(totalPendente)}</p>
          <p className="text-xs text-white/30 mt-1">{contas.filter(c => c.status === 'pendente').length} contas</p>
        </div>
        <div className="bg-[#151F32] border border-white/10 p-5 rounded-2xl">
          <p className="text-white/50 text-sm">Total Pago</p>
          <p className="text-2xl font-bold text-emerald-400 mt-2">{formatBRL(totalPago)}</p>
          <p className="text-xs text-white/30 mt-1">{contas.filter(c => c.status === 'pago').length} contas</p>
        </div>
        <div className="bg-[#151F32] border border-white/10 p-5 rounded-2xl">
          <p className="text-white/50 text-sm">Vencidas</p>
          <p className="text-2xl font-bold text-red-400 mt-2">{vencidas}</p>
          <p className="text-xs text-white/30 mt-1">precisam de atenção</p>
        </div>
        <div className="bg-[#151F32] border border-white/10 p-5 rounded-2xl">
          <p className="text-white/50 text-sm">Total Geral</p>
          <p className="text-2xl font-bold text-white mt-2">{totalGeral}</p>
          <p className="text-xs text-white/30 mt-1">contas cadastradas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#151F32] border border-white/10 p-6 rounded-2xl flex flex-col">
          <h2 className="font-bold text-lg mb-4">Gastos por Fornecedor</h2>
          <GastosChart data={gastosPorFornecedor} />
        </div>
        <div className="bg-[#151F32] border border-white/10 p-6 rounded-2xl">
          <h2 className="font-bold text-lg mb-4">Detalhe</h2>
          <div className="space-y-3">
            {gastosPorFornecedor.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between bg-black/20 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-sm">{item.name}</span>
                </div>
                <span className="font-bold">{formatBRL(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}