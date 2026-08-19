import React from 'react'
import ModuleStub from '@/components/module-stub'
import { Target } from 'lucide-react'

export default function MetasPage() {
  return (
    <ModuleStub
      title="Metas & Orçamentos"
      description="Planejamento orçamentário anual/mensal e acompanhamento de metas de faturamento."
      icon={Target}
    />
  )
}
