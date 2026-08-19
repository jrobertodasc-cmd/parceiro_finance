import React from 'react'
import ModuleStub from '@/components/module-stub'
import { TrendingUp } from 'lucide-react'

export default function DrePage() {
  return (
    <ModuleStub
      title="DRE Gerencial"
      description="Demonstrativo do Resultado do Exercício em regime de caixa e competência."
      icon={TrendingUp}
    />
  )
}
