import React from 'react'
import ModuleStub from '@/components/module-stub'
import { PieChart } from 'lucide-react'

export default function BiPage() {
  return (
    <ModuleStub
      title="Business Intelligence (BI)"
      description="Gráficos avançados, análise de tendências, ticket médio e sazonalidade."
      icon={PieChart}
    />
  )
}
