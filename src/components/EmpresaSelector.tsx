'use client'
import { useState } from 'react'
import { useEmpresa } from '@/contexts/EmpresaContext'

export function EmpresaSelector() {
  const { empresas, empresaAtual, trocarEmpresa } = useEmpresa()
  const [open, setOpen] = useState(false)

  if (!empresaAtual) return null

  const label = (e: any) => {
    const nome = e.nome || e.razao_social || e.nome_fantasia || e.apelido || 'Empresa'
    const final = e.cnpj ? e.cnpj.slice(-5) : '0001'
    return `${nome} - ${final}`
  }

  const nomeRender = (e: any) => e.nome || e.razao_social || e.nome_fantasia || e.apelido || 'Empresa'

  const grupos = {
    custo: empresas.filter(e => e.tipo === 'custo'),
    matriz: empresas.filter(e => e.cnpj?.includes('10.436.619/0001')),
    filiais: empresas.filter(e => e.tipo === 'receita' && !e.cnpj?.includes('0001-05'))
  }

  const handleSelect = (id: string) => {
    trocarEmpresa(id)
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-white text-sm min-w-[300px] justify-between transition-colors hover:bg-[#334155]"
      >
        <span className="truncate">{label(empresaAtual)}</span>
        <span className="text-xs text-white/50">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setOpen(false)}></div>
          <div className="absolute top-full mt-2 w-full min-w-[300px] bg-[#0f172a] border border-[#334155] rounded-lg shadow-xl z-[9999] max-h-[400px] overflow-auto custom-scroll">
            <div className="p-2 flex flex-col gap-1">
              
              {grupos.custo.length > 0 && (
                <>
                  <div className="text-[10px] text-[#64748b] px-3 py-1 font-bold tracking-wider">SOLAR - CENTRO DE CUSTO</div>
                  {grupos.custo.map(e => (
                    <div key={e.id} onClick={() => handleSelect(e.id)} className="px-3 py-2 hover:bg-[#1e293b] cursor-pointer text-white text-sm rounded flex items-center justify-between transition-colors">
                      <span className="truncate pr-2">{nomeRender(e)} - {e.cnpj?.slice(-5)}</span>
                      <span className="text-[10px] bg-red-900/50 text-red-400 px-2 py-0.5 rounded shrink-0 border border-red-500/20 font-bold tracking-wider">SÓ CUSTO</span>
                    </div>
                  ))}
                </>
              )}

              {grupos.matriz.length > 0 && (
                <>
                  <div className="text-[10px] text-[#64748b] px-3 py-1 mt-2 font-bold tracking-wider">MATRIZ 0001-05 - INDUSTRIA + ONLINE</div>
                  {grupos.matriz.map(e => (
                    <div key={e.id} onClick={() => handleSelect(e.id)} className="px-3 py-2 hover:bg-[#1e293b] cursor-pointer text-white text-sm rounded flex items-center justify-between transition-colors">
                      <span className="truncate pr-2">{nomeRender(e)} - {e.cnpj?.slice(-5)}</span>
                      <span className="text-[10px] bg-blue-900/50 text-blue-400 px-2 py-0.5 rounded shrink-0 border border-blue-500/20 font-bold tracking-wider">MATRIZ</span>
                    </div>
                  ))}
                </>
              )}

              {grupos.filiais.length > 0 && (
                <>
                  <div className="text-[10px] text-[#64748b] px-3 py-1 mt-2 font-bold tracking-wider">FILIAIS LALUA - COM RECEITA</div>
                  {grupos.filiais.map(e => (
                    <div key={e.id} onClick={() => handleSelect(e.id)} className="px-3 py-2 hover:bg-[#1e293b] cursor-pointer text-white text-sm rounded flex items-center justify-between transition-colors">
                      <span className="truncate pr-2">{nomeRender(e)} - {e.cnpj?.slice(-5)}</span>
                      <span className="text-[10px] bg-emerald-900/50 text-emerald-400 px-2 py-0.5 rounded shrink-0 border border-emerald-500/20 font-bold tracking-wider">RECEITA</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
