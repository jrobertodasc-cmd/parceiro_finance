"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Calendar, TrendingUp, TrendingDown, DollarSign, Activity, ChevronRight } from "lucide-react"

type DetalheDRE = {
  codigo: string
  nome: string
  tipo: 'receita' | 'despesa' | 'custo'
  total: number
}

export default function DREPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  
  // Controle de Mês/Ano
  const [mesAno, setMesAno] = useState(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  })

  const [detalhes, setDetalhes] = useState<DetalheDRE[]>([])
  const [contasRaw, setContasRaw] = useState<any[]>([])

  const carregarDRE = async () => {
    setLoading(true)
    
    // Calcula o primeiro e último dia do mês selecionado
    const [ano, mes] = mesAno.split('-')
    const startDate = `${ano}-${mes}-01`
    const ultimoDia = new Date(parseInt(ano), parseInt(mes), 0).getDate()
    const endDate = `${ano}-${mes}-${ultimoDia}`

    // DRE por Competência: Buscamos pela data de vencimento da conta_a_pagar
    const { data, error } = await supabase
      .from('contas_a_pagar')
      .select(`
        valor,
        status,
        plano_de_contas!contas_a_pagar_plano_conta_id_fkey (
          codigo,
          nome,
          tipo
        )
      `)
      .gte('vencimento', startDate)
      .lte('vencimento', endDate)
      .in('status', ['pago', 'paga', 'conciliado'])

    if (error) {
      console.error(error)
      alert("Erro ao gerar DRE: " + error.message)
      setLoading(false)
      return
    }

    setContasRaw(data || [])

    // Agrupamento por plano de contas
    const agrupado: Record<string, DetalheDRE> = {}

    data.forEach(item => {
      const plano = item.plano_de_contas
      if (!plano) return // Ignora registros sem classificação

      const valor = Number(item.valor)

      if (!agrupado[plano.codigo]) {
        agrupado[plano.codigo] = {
          codigo: plano.codigo,
          nome: plano.nome,
          tipo: plano.tipo as any,
          total: 0
        }
      }
      agrupado[plano.codigo].total += valor
    })

    // Ordenar pelo código do plano de contas
    const ordenado = Object.values(agrupado).sort((a, b) => a.codigo.localeCompare(b.codigo))
    setDetalhes(ordenado)
    setLoading(false)
  }

  useEffect(() => {
    carregarDRE()
  }, [mesAno])

  const formatCurrency = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
  }

  // Cálculos do DRE
  const receitas = detalhes.filter(d => d.tipo === 'receita')
  const custos = detalhes.filter(d => d.tipo === 'custo')
  const despesas = detalhes.filter(d => d.tipo === 'despesa')

  const receitaBruta = receitas.reduce((acc, curr) => acc + curr.total, 0)
  const totalCustos = custos.reduce((acc, curr) => acc + curr.total, 0)
  const lucroBruto = receitaBruta - totalCustos

  // TOTAL DESPESAS PUXANDO DIRETO DOS STATUS CONFORME SOLICITADO
  const totalDespesas = contasRaw.filter(c => ['pago','paga','conciliado'].includes(c.status)).reduce((s,c)=> s+Number(c.valor),0)

  const lucroLiquido = lucroBruto - totalDespesas

  const margemBruta = receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0
  const margemLiquida = receitaBruta > 0 ? (lucroLiquido / receitaBruta) * 100 : 0

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* HEADER & FILTRO */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">DRE Gerencial</h1>
          <p className="text-white/50 mt-1">Demonstração do Resultado do Exercício por Competência</p>
        </div>
        
        <div className="flex items-center bg-[#151F32] border border-white/10 rounded-xl px-4 py-2 shadow-lg">
          <Calendar size={18} className="text-blue-400 mr-3" />
          <input
            type="month"
            value={mesAno}
            onChange={(e) => setMesAno(e.target.value)}
            className="bg-transparent outline-none font-bold text-white uppercase tracking-wider cursor-pointer"
          />
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-white/50 bg-[#151F32] rounded-xl border border-white/10 shadow-lg">
          Processando matriz contábil...
        </div>
      ) : (
        <>
          {/* KPIS GERAIS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-[#151F32] border border-white/10 p-5 rounded-xl shadow-lg border-t-2 border-t-emerald-500">
              <p className="text-white/50 text-sm flex items-center gap-2"><TrendingUp size={14} className="text-emerald-400"/> Receita Bruta</p>
              <p className="text-2xl font-bold text-emerald-400 mt-2">{formatCurrency(receitaBruta)}</p>
            </div>
            
            <div className="bg-[#151F32] border border-white/10 p-5 rounded-xl shadow-lg border-t-2 border-t-amber-500">
              <p className="text-white/50 text-sm flex items-center gap-2"><Activity size={14} className="text-amber-400"/> Lucro Bruto</p>
              <p className="text-2xl font-bold text-amber-400 mt-2">{formatCurrency(lucroBruto)}</p>
              <p className="text-xs text-white/30 mt-1">Margem: {margemBruta.toFixed(1)}%</p>
            </div>

            <div className="bg-[#151F32] border border-white/10 p-5 rounded-xl shadow-lg border-t-2 border-t-red-500">
              <p className="text-white/50 text-sm flex items-center gap-2"><TrendingDown size={14} className="text-red-400"/> Despesas Totais</p>
              <p className="text-2xl font-bold text-red-400 mt-2">{formatCurrency(totalDespesas)}</p>
            </div>

            <div className={`bg-[#151F32] border border-white/10 p-5 rounded-xl shadow-lg border-t-2 ${lucroLiquido >= 0 ? 'border-t-blue-500' : 'border-t-red-500'}`}>
              <p className="text-white/50 text-sm flex items-center gap-2"><DollarSign size={14} className={lucroLiquido >= 0 ? 'text-blue-400' : 'text-red-400'}/> Lucro Líquido</p>
              <p className={`text-2xl font-bold mt-2 ${lucroLiquido >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {formatCurrency(lucroLiquido)}
              </p>
              <p className="text-xs text-white/30 mt-1">Margem: {margemLiquida.toFixed(1)}%</p>
            </div>
          </div>

          {/* ESTRUTURA DRE */}
          <div className="bg-[#151F32] rounded-xl border border-white/10 overflow-hidden shadow-lg">
            
            {/* 1. RECEITAS */}
            <div className="p-4 bg-emerald-500/10 border-b border-emerald-500/20 flex justify-between items-center">
              <h2 className="font-bold text-emerald-400 uppercase tracking-wider text-sm flex items-center gap-2">
                1. Receita Bruta
              </h2>
              <span className="font-bold text-emerald-400 font-mono">{formatCurrency(receitaBruta)}</span>
            </div>
            <div className="divide-y divide-white/5 bg-[#0F172A]/30">
              {receitas.length === 0 ? <p className="p-3 pl-8 text-xs text-white/30 italic">Sem registros no período.</p> : null}
              {receitas.map(r => (
                <div key={r.codigo} className="p-3 pl-8 flex justify-between items-center hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">{r.codigo}</span>
                    <span className="text-sm text-white/70">{r.nome}</span>
                  </div>
                  <span className="text-sm font-mono text-emerald-400/80">{formatCurrency(r.total)}</span>
                </div>
              ))}
            </div>

            {/* 2. CUSTOS */}
            <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 border-t border-t-white/10 flex justify-between items-center">
              <h2 className="font-bold text-amber-400 uppercase tracking-wider text-sm flex items-center gap-2">
                2. Custos Variáveis / CMV
              </h2>
              <span className="font-bold text-amber-400 font-mono">- {formatCurrency(totalCustos)}</span>
            </div>
            <div className="divide-y divide-white/5 bg-[#0F172A]/30">
              {custos.length === 0 ? <p className="p-3 pl-8 text-xs text-white/30 italic">Sem registros no período.</p> : null}
              {custos.map(c => (
                <div key={c.codigo} className="p-3 pl-8 flex justify-between items-center hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">{c.codigo}</span>
                    <span className="text-sm text-white/70">{c.nome}</span>
                  </div>
                  <span className="text-sm font-mono text-amber-400/80">- {formatCurrency(c.total)}</span>
                </div>
              ))}
            </div>

            {/* 3. LUCRO BRUTO */}
            <div className="p-4 bg-[#1E293B] border-b border-white/10 flex justify-between items-center">
              <h2 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
                3. Lucro Bruto (1 - 2)
              </h2>
              <span className="font-bold text-white font-mono">{formatCurrency(lucroBruto)}</span>
            </div>

            {/* 4. DESPESAS */}
            <div className="p-4 bg-red-500/10 border-b border-red-500/20 flex justify-between items-center">
              <h2 className="font-bold text-red-400 uppercase tracking-wider text-sm flex items-center gap-2">
                4. Despesas Operacionais / Fixas
              </h2>
              <span className="font-bold text-red-400 font-mono">- {formatCurrency(totalDespesas)}</span>
            </div>
            <div className="divide-y divide-white/5 bg-[#0F172A]/30">
              {despesas.length === 0 ? <p className="p-3 pl-8 text-xs text-white/30 italic">Sem registros no período.</p> : null}
              {despesas.map(d => (
                <div key={d.codigo} className="p-3 pl-8 flex justify-between items-center hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30">{d.codigo}</span>
                    <span className="text-sm text-white/70">{d.nome}</span>
                  </div>
                  <span className="text-sm font-mono text-red-400/80">- {formatCurrency(d.total)}</span>
                </div>
              ))}
            </div>

            {/* 5. LUCRO LÍQUIDO */}
            <div className={`p-5 flex justify-between items-center border-t-2 ${lucroLiquido >= 0 ? 'bg-blue-600/10 border-blue-500' : 'bg-red-600/10 border-red-500'}`}>
              <h2 className={`font-black uppercase tracking-widest text-lg ${lucroLiquido >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                5. Lucro Líquido
              </h2>
              <span className={`font-black text-xl font-mono ${lucroLiquido >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {formatCurrency(lucroLiquido)}
              </span>
            </div>

          </div>
        </>
      )}
    </div>
  )
}
