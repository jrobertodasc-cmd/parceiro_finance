'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from "@/lib/supabase/client"

export type Empresa = {
  id: string
  razao_social: string
  cnpj: string
  tipo: string
  criado_em?: string
}

type EmpresaContextType = {
  empresaAtual: Empresa | null
  empresas: Empresa[]
  trocarEmpresa: (id: string) => void
  loading: boolean
}

const EmpresaContext = createContext<EmpresaContextType | undefined>(undefined)

export function EmpresaProvider({ children }: { children: React.ReactNode }) {
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [empresaAtual, setEmpresaAtual] = useState<Empresa | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase.from('empresas').select('*').order('cnpj')
        console.log('EMPRESAS:', data, 'ERRO:', error)

        if (error || !data || data.length === 0) {
          console.error('Erro ao buscar empresas', error)
          setLoading(false)
          return
        }

        setEmpresas(data)
        const savedId = localStorage.getItem('empresa_lalua_id')
        const atual = data.find(e => e.id === savedId) || data.find(e => e.cnpj === '10.436.619/0001-05') || data[0]
        setEmpresaAtual(atual)
        if (atual) localStorage.setItem('empresa_lalua_id', atual.id)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const trocarEmpresa = (id: string) => {
    localStorage.setItem('empresa_lalua_id', id)
    const empresa = empresas.find(e => e.id === id)
    if (empresa) {
      setEmpresaAtual(empresa)
      // Recarrega a página para purgar todos os estados locais (garante que os dados de uma empresa não vazem para a outra)
      window.location.reload()
    }
  }

  return (
    <EmpresaContext.Provider value={{ empresaAtual, empresas, trocarEmpresa, loading }}>
      {children}
    </EmpresaContext.Provider>
  )
}

export function useEmpresa() {
  const context = useContext(EmpresaContext)
  if (context === undefined) {
    throw new Error('useEmpresa must be used within an EmpresaProvider')
  }
  return context
}
