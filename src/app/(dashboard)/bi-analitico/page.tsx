"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { Upload, Trash2, CheckCircle, XCircle, BarChart3, TrendingUp, AlertTriangle, Download, Link as LinkIcon, Plus } from "lucide-react"
import { useEmpresa } from "@/contexts/EmpresaContext"
import { formatBRL } from "@/lib/format"
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts"

type Extrato = {
  id?: string
  data: string
  descricao: string
  valor: number
  conciliado: boolean
  conta_id?: string | null
}

type ContaPagar = {
  id: string
  descricao: string
  valor: number
  vencimento: string
  status: 'pendente' | 'pago' | 'vencido'
  fornecedor_id: string | null
  plano_conta_id: string | null
  fornecedores?: { nome: string } | null
  plano_de_contas?: { nome: string, tipo: string } | null
}

export default function BiAnaliticoPage() {
  const supabase = createClient()
  const { empresaAtual } = useEmpresa()
  const [extratos, setExtratos] = useState<Extrato[]>([])
  const [contas, setContas] = useState<ContaPagar[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const carregarDados = async () => {
    if (!empresaAtual) return
    setLoading(true)

    let queryContas = supabase.from('contas_a_pagar').select(`
      *,
      fornecedores!contas_a_pagar_fornecedor_id_fkey (nome),
      plano_de_contas!contas_a_pagar_plano_conta_id_fkey (nome, tipo)
    `).order('vencimento', { ascending: false })

    if (empresaAtual.cnpj.includes('26.607.445')) {
      queryContas = queryContas.or(`empresa_id.eq.${empresaAtual.id},empresa_destino_id.eq.${empresaAtual.id}`)
    } else {
      queryContas = queryContas.eq('empresa_id', empresaAtual.id)
    }

    const [resExtrato, resContas] = await Promise.all([
      supabase.from('extrato_bancario').select('*').eq('empresa_id', empresaAtual.id).order('data', { ascending: false }),
      queryContas
    ])
    
    if (resExtrato.data) setExtratos(resExtrato.data)
    if (resContas.data) {
      const contasAjustadas = resContas.data.map((c: any) => {
        if (c.empresa_destino_id === empresaAtual.id && c.empresa_id !== empresaAtual.id) {
          return {
            ...c,
            descricao: "Aporte Recebido da Matriz",
            valor: -Math.abs(c.valor), // Abate o custo
            fornecedores: { nome: "Matriz (Intercompany)" },
            plano_de_contas: { nome: "Aporte Recebido", tipo: "receita" }
          }
        }
        return c
      })
      setContas(contasAjustadas as any)
    }
    setLoading(false)
  }

  useEffect(() => {
    carregarDados()
  }, [empresaAtual])

  // PARSER DE ARQUIVOS NATIVO
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    try {
      const text = await file.text()
      const parsed: Extrato[] = []

      if (file.name.toLowerCase().endsWith('.ofx')) {
        const lines = text.split('\n')
        let currentData = ''
        let currentValor = 0
        let currentMemo = ''
        
        for (const line of lines) {
          if (line.includes('<DTPOSTED>')) {
            const dateStr = line.split('<DTPOSTED>')[1].substring(0, 8)
            currentData = `${dateStr.substring(0,4)}-${dateStr.substring(4,6)}-${dateStr.substring(6,8)}`
          } else if (line.includes('<TRNAMT>')) {
            currentValor = parseFloat(line.split('<TRNAMT>')[1].trim())
          } else if (line.includes('<MEMO>')) {
            currentMemo = line.split('<MEMO>')[1].split('<')[0].trim()
          } else if (line.includes('</STMTTRN>')) {
            if (currentData && currentValor !== 0) {
              parsed.push({ data: currentData, valor: currentValor, descricao: currentMemo || 'S/ DESCRIÇÃO', conciliado: false })
            }
            currentData = ''
            currentValor = 0
            currentMemo = ''
          }
        }
      } else if (file.name.toLowerCase().endsWith('.csv')) {
        const lines = text.split('\n')
        const delim = lines[0].includes(';') ? ';' : ','
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(delim)
          if (parts.length >= 3) {
            let dateStr = parts[0].trim()
            if (dateStr.includes('/')) {
               const dParts = dateStr.split('/')
               if (dParts[2]?.length === 4) dateStr = `${dParts[2]}-${dParts[1]}-${dParts[0]}`
            }
            let valorStr = parts[parts.length - 1].trim()
            if (!valorStr && parts.length > 3) valorStr = parts[parts.length - 2].trim()
            if (valorStr) {
              valorStr = valorStr.replace('R$', '').replace('.', '').replace(',', '.').trim()
            }
            const val = parseFloat(valorStr)
            const desc = parts[1]?.trim() || 'Desconhecido'
            if (!isNaN(val) && dateStr.length >= 8) {
               parsed.push({ data: dateStr, valor: val, descricao: desc, conciliado: false })
            }
          }
        }
      }

      if (parsed.length > 0) {
        const parsedComEmpresa = parsed.map(p => ({ ...p, empresa_id: empresaAtual?.id }))
        const { error } = await supabase.from('extrato_bancario').insert(parsedComEmpresa)
        if (error) alert("Erro ao salvar extrato: " + error.message)
        else carregarDados()
      } else {
        alert("Não foi possível ler as transações do arquivo.")
      }
    } catch (err: any) {
      alert("Erro ao processar: " + err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const limparExtrato = async () => {
    if (!confirm("Tem certeza que deseja apagar todos os lançamentos do extrato?")) return
    setUploading(true)
    await supabase.from('extrato_bancario').delete().eq('empresa_id', empresaAtual?.id)
    setExtratos([])
    setUploading(false)
    carregarDados()
  }

  const conciliarManual = async (extratoId: string) => {
    // Por simplicidade na primeira versão, vamos apenas marcar como conciliado sem atrelar ID
    const { error } = await supabase.from('extrato_bancario').update({ conciliado: true }).eq('id', extratoId)
    if (!error) {
      setExtratos(prev => prev.map(e => e.id === extratoId ? { ...e, conciliado: true } : e))
    }
  }

  // ALGORITMO DE MATCH E CÁLCULO DE RESUMO
  const diasDiff = (d1: string, d2: string) => Math.abs(new Date(d1).getTime() - new Date(d2).getTime()) / (1000 * 3600 * 24)
  
  let resumoConciliado = 0
  let resumoTotal = 0

  const extratosProcessados = extratos.map(ext => {
    resumoTotal += Math.abs(ext.valor)
    
    // Se já foi conciliado manualmente ou em batida anterior, mantém
    if (ext.conciliado) {
      resumoConciliado += Math.abs(ext.valor)
      return { ...ext, match: true, matchDesc: "Conciliado" }
    }

    // Tentar match automático nas contas a pagar
    const match = contas.find(c => {
      // Regra de Valor invertida: Math.abs(abs(extrato) - abs(conta)) / abs(conta) <= 0.02
      // Mas o usuário pediu: abs(valorExtrato + valorConta) <= 2% (Porque extrato=-1500 e conta=1500 => -1500 + 1500 = 0)
      const valExt = ext.valor
      const valConta = c.valor
      const difAbsoluta = Math.abs(valExt + valConta)
      const margem2Pct = Math.abs(valConta) * 0.02
      const isMatchValor = difAbsoluta <= margem2Pct

      // Regra de Data: +- 3 dias
      const difData = diasDiff(ext.data, c.vencimento)
      
      return isMatchValor && difData <= 3
    })

    if (match) {
      resumoConciliado += Math.abs(ext.valor)
      // Auto-update no banco para as próximas vezes (fire and forget)
      supabase.from('extrato_bancario').update({ conciliado: true, conta_id: match.id }).eq('id', ext.id).then()
      return { ...ext, match: true, matchDesc: match.descricao }
    }

    return { ...ext, match: false, matchDesc: "" }
  })

  const pctConciliacao = resumoTotal > 0 ? (resumoConciliado / resumoTotal) * 100 : 0

  // -------------------------------------------------------------
  // LÓGICA DO BI ANALÍTICO (ÚLTIMOS 90 DIAS)
  // -------------------------------------------------------------
  const hoje = new Date()
  const hojeStr = hoje.toISOString().split('T')[0]
  const noventaDiasAtras = new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const contas90d = contas.filter(c => c.vencimento >= noventaDiasAtras && c.vencimento <= hojeStr)
  const contas30d = contas.filter(c => c.vencimento >= trintaDiasAtras && c.vencimento <= hojeStr)
  const contas60a90d = contas.filter(c => c.vencimento >= noventaDiasAtras && c.vencimento < trintaDiasAtras)

  // 1. Top Fornecedor (90d)
  const mapForn = new Map<string, { nome: string, total: number }>()
  let total90d = 0
  contas90d.forEach(c => {
    total90d += c.valor
    const n = c.fornecedores?.nome || 'Desconhecido'
    const cur = mapForn.get(n) || { nome: n, total: 0 }
    cur.total += c.valor
    mapForn.set(n, cur)
  })
  const topForn = Array.from(mapForn.values()).sort((a,b) => b.total - a.total)[0]
  const topFornPct = topForn && total90d > 0 ? (topForn.total / total90d) * 100 : 0

  // 2. Fixo vs Variável (90d)
  let custoFixo = 0
  let custoVariavel = 0
  contas90d.forEach(c => {
    const tipo = c.plano_de_contas?.tipo || ''
    // Fixo ('fixo' ou 'despesa'), Variável ('variavel' ou 'custo')
    if (tipo === 'variavel' || tipo === 'custo') custoVariavel += c.valor
    else custoFixo += c.valor // Default é Fixo se não houver categorização perfeita
  })

  // 3. Ticket Médio por Dia da Semana (90d)
  const diasSemanaNome = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']
  const statsDia = Array.from({length: 7}).map(() => ({ sum: 0, count: 0 }))
  contas90d.forEach(c => {
    // Para pegar o dia da semana sem fuso quebrando, garantimos a string com timezone
    const d = new Date(c.vencimento + 'T12:00:00').getDay()
    statsDia[d].sum += c.valor
    statsDia[d].count += 1
  })
  let piorDia = { nome: '-', media: 0 }
  statsDia.forEach((st, i) => {
    const med = st.count > 0 ? st.sum / st.count : 0
    if (med > piorDia.media) piorDia = { nome: diasSemanaNome[i], media: med }
  })

  // 4. Evolução
  const sum30dAtual = contas30d.reduce((acc, c) => acc + c.valor, 0)
  const sum60dAntigo = contas60a90d.reduce((acc, c) => acc + c.valor, 0)
  const mediaMensalAntiga = sum60dAntigo / 2 // Média de 2 meses
  const variacaoEvolucao = mediaMensalAntiga > 0 ? ((sum30dAtual / mediaMensalAntiga) - 1) * 100 : 0

  // GRÁFICOS
  // BarChart: Gastos por Categoria
  const mapCat = new Map<string, number>()
  contas90d.forEach(c => {
    const n = c.plano_de_contas?.nome || 'Sem Categoria'
    mapCat.set(n, (mapCat.get(n) || 0) + c.valor)
  })
  const chartCategorias = Array.from(mapCat.entries()).map(([name, valor]) => ({ name, valor })).sort((a,b) => b.valor - a.valor).slice(0, 10)

  // LineChart: Evolução 30 dias (Real vs Previsto)
  const mapDiario = new Map<string, { Realizado: number, Previsto: number, show?: string }>()
  // Inicializar ultimos 30 dias com 0
  for (let i = 29; i >= 0; i--) {
    const d = new Date(hoje.getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const shortDate = d.substring(8,10) + '/' + d.substring(5,7)
    mapDiario.set(d, { Realizado: 0, Previsto: 0, show: shortDate as any })
  }
  contas30d.forEach(c => {
    const dataObj = mapDiario.get(c.vencimento)
    if (dataObj) {
      if (c.status === 'pago') dataObj.Realizado += c.valor
      else dataObj.Previsto += c.valor // pendente ou vencido
    }
  })
  const chartDiario = Array.from(mapDiario.values())

  // Tabela: Despesas que mais cresceram
  const tblMap = new Map<string, { forn: string, sumAtual: number, sumAntigo: number }>()
  contas90d.forEach(c => {
    const fid = c.fornecedor_id || 'sem-id'
    const fnome = c.fornecedores?.nome || 'Desconhecido'
    const cur = tblMap.get(fid) || { forn: fnome, sumAtual: 0, sumAntigo: 0 }
    
    if (c.vencimento >= trintaDiasAtras) cur.sumAtual += c.valor
    else cur.sumAntigo += c.valor

    tblMap.set(fid, cur)
  })
  const tableCrescimento = Array.from(tblMap.values()).map(r => {
    const mediaAntiga = r.sumAntigo / 2
    const variacao = mediaAntiga > 0 ? ((r.sumAtual / mediaAntiga) - 1) * 100 : 0
    return { ...r, mediaAntiga, variacao }
  }).filter(r => r.variacao > 0).sort((a,b) => b.variacao - a.variacao).slice(0, 8)

  // formatBRL importado de lib

  if (loading) {
    return <div className="flex-1 flex items-center justify-center min-h-screen text-white/50">Carregando painel analítico...</div>
  }

  return (
    <div className="p-6 md:p-8 space-y-8 pb-20 custom-scroll">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <TrendingUp className="text-blue-500" /> BI Analítico & Conciliação
          </h1>
          <p className="text-white/50 mt-1">Descubra onde o dinheiro está vazando e reconcilie contas reais.</p>
        </div>
        <button className="bg-emerald-600 hover:bg-emerald-500 transition-colors px-4 py-2.5 rounded-lg font-semibold flex items-center gap-2 shadow-lg">
          <Download size={18} /> Exportar DRE Conciliado
        </button>
      </div>

      {/* =========================================
          SEÇÃO 1: CONCILIAÇÃO REAL
      ========================================= */}
      <section className="bg-[#151F32] rounded-xl border border-white/10 overflow-hidden shadow-lg">
        <div className="p-5 border-b border-white/10 bg-[#0F172A]/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold text-lg">Conciliação de Extrato Bancário</h2>
            <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-bold border border-blue-500/20">
              {extratos.length} Lançamentos
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <input 
              type="file" 
              accept=".ofx,.csv" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-white/10 hover:bg-white/20 transition-colors px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
            >
              <Upload size={16} /> {uploading ? 'Processando...' : 'Importar OFX/CSV'}
            </button>
            <button 
              onClick={limparExtrato}
              disabled={uploading || extratos.length === 0}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors px-3 py-2 rounded-lg text-sm font-semibold"
              title="Limpar todos os extratos"
            >
              <Trash2 size={16} /> Limpar
            </button>
          </div>
        </div>

        {/* Resumo Conciliação */}
        <div className="grid grid-cols-3 divide-x divide-white/10 border-b border-white/10 bg-[#0B1120]/50 text-sm">
          <div className="p-4 text-center">
            <p className="text-white/40 mb-1">Total do Extrato</p>
            <p className="text-lg font-bold font-mono">{formatBRL(resumoTotal)}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-emerald-400/60 mb-1">Valor Conciliado</p>
            <p className="text-lg font-bold font-mono text-emerald-400">{formatBRL(resumoConciliado)}</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-white/40 mb-1">Status Geral</p>
            <p className={`text-lg font-bold font-mono ${pctConciliacao === 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {pctConciliacao.toFixed(1)}% <span className="text-xs font-normal opacity-50 ml-1">batido</span>
            </p>
          </div>
        </div>

        {/* Tabela de Lançamentos */}
        <div className="max-h-96 overflow-y-auto scrollbar-hide">
          {extratosProcessados.length === 0 ? (
            <div className="p-10 text-center text-white/30 text-sm">
              Nenhum extrato importado. Clique em Importar OFX/CSV para começar.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {extratosProcessados.map((ext, idx) => (
                <div key={ext.id || idx} className={`flex flex-col sm:flex-row items-start sm:items-center p-4 gap-4 border-l-4 ${ext.match ? 'border-l-emerald-500 bg-emerald-500/5' : 'border-l-red-500 bg-red-500/5'}`}>
                  <div className="w-24 shrink-0 text-sm font-mono text-white/50">
                    {new Date(ext.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{ext.descricao}</p>
                    {ext.match ? (
                      <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                        <CheckCircle size={12} /> {ext.matchDesc}
                      </p>
                    ) : (
                      <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                        <XCircle size={12} /> Não encontrado nas contas a pagar (+-3d, +-2%)
                      </p>
                    )}
                  </div>
                  <div className="w-28 text-right shrink-0">
                    <p className="text-sm font-bold font-mono">{formatBRL(ext.valor)}</p>
                  </div>
                  <div className="w-32 shrink-0 flex justify-end">
                    {!ext.match && (
                      <div className="flex gap-2">
                         <button onClick={() => conciliarManual(ext.id!)} className="bg-white/10 hover:bg-white/20 p-1.5 rounded-md text-xs text-white/70 transition-colors" title="Forçar Conciliação Manual">
                           <LinkIcon size={14} />
                         </button>
                         <button className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1">
                           <Plus size={14} /> Criar
                         </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =========================================
          SEÇÃO 2: BI ANALÍTICO (KPIs 90D)
      ========================================= */}
      <div>
        <h2 className="text-xl font-bold mb-4">Métricas de 90 Dias</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-[#151F32] p-5 rounded-xl border border-white/10 border-l-4 border-l-purple-500 shadow-lg">
            <p className="text-xs text-white/50 uppercase font-bold tracking-wider mb-2">Maior Fornecedor</p>
            <p className="text-lg font-bold truncate" title={topForn?.nome}>{topForn?.nome || '-'}</p>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="font-mono text-purple-400 font-bold">{formatBRL(topForn?.total || 0)}</span>
              <span className="bg-purple-500/10 text-purple-400 px-2 rounded">{topFornPct.toFixed(1)}%</span>
            </div>
          </div>

          <div className="bg-[#151F32] p-5 rounded-xl border border-white/10 border-l-4 border-l-blue-500 shadow-lg">
            <p className="text-xs text-white/50 uppercase font-bold tracking-wider mb-2">Estrutura de Custo</p>
            <div className="flex flex-col gap-1 mt-1">
              <div className="flex justify-between items-center text-sm">
                <span>Fixo</span>
                <span className="font-mono font-bold text-blue-400">{formatBRL(custoFixo)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Variável</span>
                <span className="font-mono font-bold text-amber-400">{formatBRL(custoVariavel)}</span>
              </div>
            </div>
          </div>

          <div className="bg-[#151F32] p-5 rounded-xl border border-white/10 border-l-4 border-l-amber-500 shadow-lg">
            <p className="text-xs text-white/50 uppercase font-bold tracking-wider mb-2">Pior Dia da Semana</p>
            <p className="text-lg font-bold">{piorDia.nome}</p>
            <p className="mt-2 text-sm text-white/50">Média de <span className="font-mono text-amber-400 font-bold">{formatBRL(piorDia.media)}</span> por dia</p>
          </div>

          <div className="bg-[#151F32] p-5 rounded-xl border border-white/10 border-l-4 border-l-emerald-500 shadow-lg">
            <p className="text-xs text-white/50 uppercase font-bold tracking-wider mb-2">Evolução (30d vs 60d)</p>
            <p className="text-lg font-bold">{formatBRL(sum30dAtual)} <span className="text-sm font-normal text-white/40">agora</span></p>
            <p className="mt-2 text-sm flex items-center gap-1">
              <span className={`font-bold px-1.5 py-0.5 rounded ${variacaoEvolucao > 0 ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {variacaoEvolucao > 0 ? '+' : ''}{variacaoEvolucao.toFixed(1)}%
              </span>
              <span className="text-white/40">vs média histórica</span>
            </p>
          </div>

        </div>
      </div>

      {/* =========================================
          SEÇÃO 3: GRÁFICOS
      ========================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gráfico de Categorias */}
        <div className="bg-[#151F32] p-5 rounded-xl border border-white/10 shadow-lg">
          <h3 className="font-bold mb-6 flex items-center gap-2"><BarChart3 size={18} className="text-blue-500"/> Gastos por Categoria (90d)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartCategorias} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} stroke="#ffffff50" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#ffffff50" fontSize={11} width={90} />
                <RechartsTooltip 
                  cursor={{fill: '#ffffff05'}}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff20', borderRadius: '8px' }}
                  formatter={(value: any) => [formatBRL(value || 0), 'Gasto']}
                />
                <Bar dataKey="valor" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico Diário */}
        <div className="bg-[#151F32] p-5 rounded-xl border border-white/10 shadow-lg">
          <h3 className="font-bold mb-6 flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500"/> Evolução Diária (30d)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartDiario} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="show" stroke="#ffffff50" fontSize={11} tickMargin={10} minTickGap={20} />
                <YAxis tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} stroke="#ffffff50" fontSize={11} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff20', borderRadius: '8px' }}
                  formatter={(value: any) => [formatBRL(value || 0), '']}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                <Line type="monotone" name="Realizado (Pago)" dataKey="Realizado" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                <Line type="monotone" name="Previsto (Pendente)" dataKey="Previsto" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* =========================================
          SEÇÃO 4: ALERTA DE CRESCIMENTO
      ========================================= */}
      <div className="bg-[#151F32] rounded-xl border border-white/10 overflow-hidden shadow-lg">
        <div className="p-5 border-b border-white/10 bg-[#0F172A]/50">
          <h3 className="font-bold flex items-center gap-2"><AlertTriangle size={18} className="text-red-500"/> Despesas que mais Cresceram (Fornecedores)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-white/40 uppercase bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-3">Fornecedor</th>
                <th className="px-6 py-3">Média 60-90d</th>
                <th className="px-6 py-3">Mês Atual (30d)</th>
                <th className="px-6 py-3">Variação</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tableCrescimento.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-white/30">Nenhum aumento expressivo detectado.</td>
                </tr>
              ) : (
                tableCrescimento.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-4 font-semibold">{row.forn}</td>
                    <td className="px-6 py-4 font-mono text-white/50">{formatBRL(row.mediaAntiga)}</td>
                    <td className="px-6 py-4 font-mono font-bold">{formatBRL(row.sumAtual)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded font-bold text-xs ${row.variacao > 15 ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        +{row.variacao.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {row.variacao > 15 ? <span title="Crescimento Crítico">🔥</span> : <span title="Atenção">⚠️</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
