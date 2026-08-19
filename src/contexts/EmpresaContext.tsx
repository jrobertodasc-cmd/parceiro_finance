'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

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
  const supabase = createClientComponentClient()

  useEffect(() => {
    async function carregarEmpresas() {
      try {
        const { data, error } = await supabase
          .from('empresas')
          .select('*')
          .order('cnpj')

        if (error) throw error
        
        if (data && data.length > 0) {
          setEmpresas(data)
          
          const savedId = localStorage.getItem('empresa_lalua_id')
          if (savedId) {
            const savedEmpresa = data.find(e => e.id === savedId)
            if (savedEmpresa) {
              setEmpresaAtual(savedEmpresa)
            } else {
              setEmpresaAtual(data[0])
              localStorage.setItem('empresa_lalua_id', data[0].id)
            }
          } else {
            setEmpresaAtual(data[0])
            localStorage.setItem('empresa_lalua_id', data[0].id)
          }
        }
      } catch (err) {
        console.error('Erro ao carregar empresas:', err)
      } finally {
        setLoading(false)
      }
    }

    carregarEmpresas()
  }, [supabase])

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
