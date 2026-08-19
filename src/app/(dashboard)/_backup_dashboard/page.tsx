import React from 'react'
import ModuleStub from '@/components/module-stub'
import { LayoutDashboard } from 'lucide-react'

export default function DashboardPage() {
  return (
    <ModuleStub
      title="Dashboard Visão Geral"
      description="Resumo executivo do caixa, faturamento, despesas e indicadores-chave."
      icon={LayoutDashboard}
    />
  )
}
