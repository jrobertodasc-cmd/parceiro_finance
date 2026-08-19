'use client'

import { useEmpresa } from "@/contexts/EmpresaContext"
import { Building2 } from "lucide-react"

export function EmpresaSelector() {
  const { empresaAtual, empresas, trocarEmpresa, loading } = useEmpresa()

  if (loading || !empresaAtual) return <div className="h-9 w-64 animate-pulse bg-[#1E293B] rounded-lg"></div>

  const solar = empresas.filter(e => e.cnpj && e.cnpj.includes('26.607.445'))
  const matriz = empresas.filter(e => e.cnpj && e.cnpj.includes('10.436.619'))
  const filiais = empresas.filter(e => e.cnpj && !e.cnpj.includes('26.607.445') && !e.cnpj.includes('10.436.619'))

  // Formatador pra exibir final CNPJ, ex: "Barra - 02-88"
  const formatName = (empresa: any) => {
    if (!empresa.cnpj) return empresa.razao_social
    const final = empresa.cnpj.slice(-7)
    return `${empresa.razao_social} - ${final}`
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 bg-[#1E293B] border border-[#334155] rounded-lg px-2 py-1.5 focus-within:ring-1 focus-within:ring-blue-500 transition-shadow">
        <Building2 size={16} className="text-white/50 ml-1" />
        <select
          value={empresaAtual.id}
          onChange={(e) => trocarEmpresa(e.target.value)}
          className="bg-transparent text-sm text-white outline-none cursor-pointer w-56 truncate"
        >
          {solar.length > 0 && (
            <optgroup label="SOLAR - CENTRO DE CUSTO (26.607.445)">
              {solar.map(e => <option key={e.id} value={e.id}>{formatName(e)}</option>)}
            </optgroup>
          )}
          {matriz.length > 0 && (
            <optgroup label="MATRIZ 0001-05 - INDUSTRIA + ONLINE">
              {matriz.map(e => <option key={e.id} value={e.id}>{formatName(e)}</option>)}
            </optgroup>
          )}
          {filiais.length > 0 && (
            <optgroup label="FILIAIS LALUA - LOJAS COM RECEITA">
              {filiais.map(e => <option key={e.id} value={e.id}>{formatName(e)}</option>)}
            </optgroup>
          )}
        </select>
      </div>

      {empresaAtual.tipo === 'custo' ? (
        <span className="px-2.5 py-1 text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 rounded-md whitespace-nowrap">
          Centro de Custo - Recebe da Matriz
        </span>
      ) : (
        <span className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md whitespace-nowrap">
          Com Receita Própria
        </span>
      )}
    </div>
  )
}
