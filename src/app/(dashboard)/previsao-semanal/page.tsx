"use client"

import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { ChevronLeft, ChevronRight, Bot, CheckCircle2, Clock, AlertTriangle, X, Target } from "lucide-react"

type Conta = {
  id: string
  descricao: string
  valor: number
  vencimento: string
  status: string
  plano_conta_id?: string
  plano_de_contas?: { codigo: string, nome: string } | null
}

type Previsao = {
  id: string // temporary ID
  descricao: string
  valor: number
  dia_medio: number
  isPrevisao: boolean
  vencimentoCalculado: string
  plano_conta_id?: string
}

export default function PrevisaoSemanalPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  
  // Controle da Semana Atual (Começa na segunda-feira atual)
  const getSegundaFeira = (d: Date) => {
    const data = new Date(d)
    const dia = data.getDay()
    const diff = data.getDate() - dia + (dia === 0 ? -6 : 1) // ajusta se for domingo
    return new Date(data.setDate(diff))
  }
  
  const [dataRef, setDataRef] = useState(getSegundaFeira(new Date()))
  
  const [contasReais, setContasReais] = useState<Conta[]>([])
  const [previsoes, setPrevisoes] = useState<Previsao[]>([])
  const [saldoEstimado, setSaldoEstimado] = useState(0)
  
  // Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<Partial<Previsao & Conta> | null>(null)
  const [salvando, setSalvando] = useState(false)

  // Planos disponíveis para o modal
  const [planos, setPlanos] = useState<{id: string, codigo: string, nome: string}[]>([])

  const carregarDados = async () => {
    setLoading(true)

    // Data da semana exibida (Segunda a Domingo)
    const seg = new Date(dataRef)
    const dom = new Date(dataRef)
    dom.setDate(dom.getDate() + 6)
    
    const startStr = seg.toISOString().split('T')[0]
    const endStr = dom.toISOString().split('T')[0]

    // 1. Busca Planos para o Modal
    const { data: dataPlanos } = await supabase
      .from('plano_de_contas')
      .select('id, codigo, nome')
      .in('codigo', ['1.01.007', '2.01.001', '2.01.002'])
    
    if (dataPlanos) setPlanos(dataPlanos)

    // 2. Busca contas REAIS da semana exibida
    const { data: reais } = await supabase
      .from('contas_a_pagar')
      .select('*, plano_de_contas!contas_a_pagar_plano_conta_id_fkey(codigo,nome)')
      .gte('vencimento', startStr)
      .lte('vencimento', endStr)
      .order('vencimento')

    if (reais) setContasReais(reais)

    // 3. Busca contas dos últimos 90 dias para calcular RECORRÊNCIA (Previsões)
    const hoje = new Date()
    const noventaDiasAtras = new Date()
    noventaDiasAtras.setDate(hoje.getDate() - 90)

    const { data: historico } = await supabase
      .from('contas_a_pagar')
      .select('descricao, valor, vencimento')
      .gte('vencimento', noventaDiasAtras.toISOString().split('T')[0])

    // Inteligência de Agrupamento JS
    const agrupamento: Record<string, { count: number, total: number, dias: number[] }> = {}

    if (historico) {
      historico.forEach(c => {
        const desc = c.descricao.trim().toUpperCase()
        if (!agrupamento[desc]) {
          agrupamento[desc] = { count: 0, total: 0, dias: [] }
        }
        agrupamento[desc].count++
        agrupamento[desc].total += Number(c.valor)
        const dia = parseInt(c.vencimento.split('-')[2])
        agrupamento[desc].dias.push(dia)
      })
    }

    const prevList: Previsao[] = []
    
    Object.keys(agrupamento).forEach(desc => {
      const g = agrupamento[desc]
      if (g.count >= 2) { // Apareceu 2 vezes = recorrente
        const mediaValor = g.total / g.count
        const mediaDia = Math.round(g.dias.reduce((a, b) => a + b, 0) / g.count)
        
        // Verifica se essa predição cairia nesta semana específica
        const mesRef = dataRef.getMonth()
        const anoRef = dataRef.getFullYear()
        
        // Cria a data da previsão baseada no dia médio
        let dataPrev = new Date(anoRef, mesRef, mediaDia)
        
        // Se a data calculada for fim de semana, move pra sexta ou segunda dependendo
        if (dataPrev.getDay() === 0) dataPrev.setDate(mediaDia + 1)
        if (dataPrev.getDay() === 6) dataPrev.setDate(mediaDia - 1)

        const prevStr = dataPrev.toISOString().split('T')[0]

        // Só inclui se a data prevista cair dentro da range Seg-Sex exibida
        if (prevStr >= startStr && prevStr <= endStr) {
          // Bloqueio de Duplicidade: Verifica se JÁ EXISTE uma conta real nessa semana com mesmo nome
          const jaTemReal = reais?.some(r => r.descricao.toUpperCase() === desc)
          
          if (!jaTemReal) {
            prevList.push({
              id: `prev_${Math.random().toString(36).substring(7)}`,
              descricao: desc,
              valor: mediaValor,
              dia_medio: mediaDia,
              vencimentoCalculado: prevStr,
              isPrevisao: true,
              plano_conta_id: dataPlanos?.find(p => p.codigo === '2.01.002')?.id // default
            })
          }
        }
      }
    })

    setPrevisoes(prevList)
    
    // Atualiza saldo projetado (Total Reais + Previstas)
    const sumReais = reais ? reais.reduce((acc, c) => acc + Number(c.valor), 0) : 0
    const sumPrev = prevList.reduce((acc, c) => acc + c.valor, 0)
    setSaldoEstimado(sumReais + sumPrev)
    
    setLoading(false)
  }

  useEffect(() => {
    carregarDados()
  }, [dataRef])

  const mudarSemana = (dias: number) => {
    const novaRef = new Date(dataRef)
    novaRef.setDate(novaRef.getDate() + dias)
    setDataRef(novaRef)
  }

  // Gera array com os 7 dias da semana atual
  const diasDaSemana = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(dataRef)
    d.setDate(d.getDate() + i)
    return d
  })

  const hojeStr = new Date().toISOString().split('T')[0]
  const scrollRef = useRef<HTMLDivElement>(null)

  const openModal = (item: any, isPrev: boolean) => {
    setEditItem({ ...item, isPrevisao: isPrev, originalId: item.id })
    setModalOpen(true)
  }

  const handleLancar = async () => {
    if (!editItem) return
    setSalvando(true)

    try {
      if (editItem.isPrevisao) {
        // Insere nova conta vinda de previsão
        const { error } = await supabase.from('contas_a_pagar').insert({
          descricao: editItem.descricao,
          valor: editItem.valor,
          vencimento: editItem.vencimento || editItem.vencimentoCalculado,
          plano_conta_id: editItem.plano_conta_id || null,
          status: 'pendente',
          origem: 'previsao',
          xml_chave: null
        })
        if (error) throw error
      } else {
        // Edita conta existente
        const { error } = await supabase.from('contas_a_pagar').update({
          descricao: editItem.descricao,
          valor: editItem.valor,
          vencimento: editItem.vencimento,
          plano_conta_id: editItem.plano_conta_id || null,
        }).eq('id', editItem.id)
        if (error) throw error
      }

      setModalOpen(false)
      await carregarDados() // Recarrega para transformar amarelo em azul
    } catch (err: any) {
      alert("Erro ao salvar: " + err.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 flex flex-col relative overflow-visible">
      
      {/* HEADER E NAVEGAÇÃO */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Target className="text-blue-500" />
            Previsão Semanal
          </h1>
          <p className="text-white/50 mt-1">O robô analisa os últimos 90 dias e alerta sobre despesas esquecidas.</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm text-white/50 uppercase tracking-wider">Compromisso Estimado (Semana)</p>
            <p className="text-2xl font-bold font-mono text-red-400">R$ {saldoEstimado.toFixed(2)}</p>
          </div>
          
          <div className="flex items-center bg-[#151F32] border border-white/10 rounded-xl overflow-hidden shadow-lg">
            <button onClick={() => mudarSemana(-7)} className="p-3 hover:bg-white/10 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div className="px-4 font-bold text-sm text-white">
              {dataRef.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - 
              {diasDaSemana[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </div>
            <button onClick={() => mudarSemana(7)} className="p-3 hover:bg-white/10 transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* KANBAN DAS COLUNAS (SEG - DOM) */}
      <div className="relative w-full mt-4 pr-4 overflow-visible group/kanban">
        <button 
          onClick={() => scrollRef.current?.scrollBy({left: -340, behavior: 'smooth'})}
          className="absolute left-0 md:left-[-16px] top-1/2 -translate-y-1/2 z-30 bg-slate-800/80 backdrop-blur-sm border border-white/20 text-white rounded-full w-10 h-10 flex items-center justify-center opacity-80 hover:opacity-100 transition-all shadow-lg"
        >
          ‹
        </button>

        <div 
          ref={scrollRef} 
          onScroll={(e) => {
            const target = e.currentTarget;
            if (target.scrollLeft + target.clientWidth >= target.scrollWidth - 10) {
              if (!loading) {
                mudarSemana(7);
                target.scrollLeft = target.scrollLeft - 150;
              }
            }
          }}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-6 px-2 md:px-6 snap-x snap-mandatory"
          style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}
        >
          {loading ? (
            <div className="w-full flex items-center justify-center text-white/30 py-10">Lendo histórico financeiro...</div>
          ) : (
            diasDaSemana.map((dia, idx) => {
              const dataStr = dia.toISOString().split('T')[0]
              const isHoje = dataStr === hojeStr
              
              // Filtra o que cai neste dia específico
              const contasDia = contasReais.filter(c => c.vencimento === dataStr)
              const prevsDia = previsoes.filter(p => p.vencimentoCalculado === dataStr)

              const nomesDias = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]

              return (
                <div 
                  key={dataStr} 
                  className={`min-w-[280px] md:min-w-[320px] max-w-[320px] shrink-0 snap-start bg-[#151F32]/80 rounded-2xl border flex flex-col overflow-hidden transition-colors ${
                    isHoje ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'border-white/10'
                  }`}
                >
                  {/* Cabeçalho da Coluna */}
                  <div className={`p-4 border-b ${isHoje ? 'bg-blue-600/20 border-blue-500/50' : 'bg-[#0F172A]/50 border-white/10'}`}>
                    <p className="text-sm font-bold uppercase tracking-wider text-white/70">
                      {nomesDias[idx]}
                    </p>
                    <p className={`text-xl font-bold mt-1 ${isHoje ? 'text-blue-400' : 'text-white'}`}>
                      {dia.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      {isHoje && <span className="ml-2 text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">Hoje</span>}
                    </p>
                  </div>

                  {/* Conteúdo (Cards) */}
                  <div className="flex-1 overflow-y-auto custom-scroll p-3 space-y-3 max-h-[60vh]">
                    
                    {/* PREVISÕES */}
                    {prevsDia.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => openModal(p, true)}
                        className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl cursor-pointer hover:bg-amber-500/20 hover:ring-1 hover:ring-amber-500/50 transition-colors group relative"
                      >
                        <div className="absolute -top-2 -right-2 bg-amber-500 text-[#0F172A] w-6 h-6 rounded-full flex items-center justify-center shadow-lg">
                          <Bot size={14} className="animate-bounce" />
                        </div>
                        <p className="text-xs font-bold text-amber-500 mb-1 uppercase tracking-wider">Alerta de Previsão</p>
                        <p className="font-bold text-sm text-white/90 truncate pr-4">{p.descricao}</p>
                        <p className="font-mono text-amber-400 font-bold mt-2">R$ {p.valor.toFixed(2)}</p>
                        <p className="text-[10px] text-amber-500/70 mt-2">Média 90d: R$ {p.valor.toFixed(2)}</p>
                      </div>
                    ))}

                    {/* REAIS */}
                    {contasDia.map(c => {
                      const isVencido = c.status !== 'pago' && dataStr < hojeStr
                      const isPago = c.status === 'pago' || c.status === 'conciliado'
                      
                      let bgClass = "bg-white/5 border-white/10 hover:bg-white/10"
                      let textValor = "text-white"
                      let statusLabel = <span className="text-blue-400 text-[10px] flex items-center gap-1"><Clock size={10}/> Pendente</span>
                      
                      if (isVencido) {
                        bgClass = "bg-red-500/10 border-red-500/30 hover:bg-red-500/20"
                        textValor = "text-red-400"
                        statusLabel = <span className="text-red-400 text-[10px] flex items-center gap-1 font-bold"><AlertTriangle size={10}/> Vencido</span>
                      } else if (isPago) {
                        bgClass = "bg-emerald-500/10 border-emerald-500/20 opacity-60 hover:opacity-100"
                        textValor = "text-emerald-400"
                        statusLabel = <span className="text-emerald-400 text-[10px] flex items-center gap-1 font-bold"><CheckCircle2 size={10}/> Liquidação Efetuada</span>
                      }

                      return (
                        <div 
                          key={c.id}
                          onClick={() => openModal(c, false)}
                          className={`${bgClass} border p-3 rounded-xl transition-colors relative cursor-pointer hover:ring-1 hover:ring-white/30`}
                        >
                          <div className="flex justify-between items-start mb-1">
                            {statusLabel}
                            {c.plano_de_contas && <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-white/50 truncate max-w-[80px]">{c.plano_de_contas.nome}</span>}
                          </div>
                          <p className={`font-bold text-sm truncate ${isPago ? 'line-through text-white/40' : 'text-white/90'}`}>{c.descricao}</p>
                          <p className={`font-mono font-bold mt-2 ${textValor}`}>R$ {c.valor.toFixed(2)}</p>
                        </div>
                      )
                    })}

                    {contasDia.length === 0 && prevsDia.length === 0 && (
                      <div className="h-24 flex items-center justify-center text-white/20 text-xs text-center border border-dashed border-white/10 rounded-xl">
                        Nenhum compromisso
                      </div>
                    )}

                  </div>
                </div>
              )
            })
          )}
        </div>

        <button 
          onClick={() => scrollRef.current?.scrollBy({left: 340, behavior: 'smooth'})}
          className="absolute right-0 md:right-[-16px] top-1/2 -translate-y-1/2 z-30 bg-slate-800/80 backdrop-blur-sm border border-white/20 text-white rounded-full w-10 h-10 flex items-center justify-center opacity-80 hover:opacity-100 transition-all shadow-lg"
        >
          ›
        </button>
      </div>

      {/* MODAL CUSTOMIZADO (SUBSTITUTO SHADCN DIALOG) */}
      {modalOpen && editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#151F32] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-[#0F172A]/50">
              <h2 className="font-bold text-lg flex items-center gap-2">
                {editItem.isPrevisao ? <Bot className="text-amber-400" size={20}/> : <Clock className="text-blue-400" size={20}/>}
                {editItem.isPrevisao ? "Validar Previsão da IA" : "Editar Lançamento"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-white/40 hover:text-white p-1 rounded transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider font-bold mb-1 block">Fornecedor / Descrição</label>
                <input 
                  type="text" 
                  value={editItem.descricao} 
                  onChange={e => setEditItem({...editItem, descricao: e.target.value.toUpperCase()})}
                  className="w-full bg-[#0B1120] border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-blue-500 transition-colors uppercase font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-white/50 uppercase tracking-wider font-bold mb-1 block">Valor (R$)</label>
                  <input 
                    type="number" 
                    value={editItem.valor} 
                    onChange={e => setEditItem({...editItem, valor: Number(e.target.value)})}
                    className="w-full bg-[#0B1120] border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-blue-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs text-white/50 uppercase tracking-wider font-bold mb-1 block">Vencimento</label>
                  <input 
                    type="date" 
                    value={editItem.vencimento || editItem.vencimentoCalculado} 
                    onChange={e => setEditItem({...editItem, vencimento: e.target.value})}
                    className="w-full bg-[#0B1120] border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-white/50 uppercase tracking-wider font-bold mb-1 block">Plano de Contas</label>
                <select 
                  value={editItem.plano_conta_id || ""}
                  onChange={e => setEditItem({...editItem, plano_conta_id: e.target.value})}
                  className="w-full bg-[#0B1120] border border-white/10 rounded-lg px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
                >
                  <option value="">Selecione...</option>
                  {planos.map(p => (
                    <option key={p.id} value={p.id}>{p.codigo} - {p.nome}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 bg-[#0F172A]/50 border-t border-white/10 flex justify-end gap-3">
              <button 
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-bold text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleLancar}
                disabled={salvando}
                className={`px-6 py-2 rounded-lg text-sm font-bold text-white transition-colors flex items-center gap-2 ${
                  editItem.isPrevisao 
                    ? 'bg-amber-600 hover:bg-amber-500' 
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {salvando ? 'Gravando...' : (editItem.isPrevisao ? 'Virar Despesa Real' : 'Salvar Alterações')}
                {!salvando && <CheckCircle2 size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
