import React from 'react'
import ModuleStub from '@/components/module-stub'
import { Sparkles } from 'lucide-react'

export default function CopilotoPage() {
  return (
    <ModuleStub
      title="Copiloto IA"
      description="Assistente inteligente para análise financeira, projeções e sugestões de corte de custos."
      icon={Sparkles}
      badge="IA"
    />
  )
}
