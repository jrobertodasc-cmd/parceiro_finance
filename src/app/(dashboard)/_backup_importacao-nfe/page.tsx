import React from 'react'
import ModuleStub from '@/components/module-stub'
import { FileText } from 'lucide-react'

export default function ImportacaoNFePage() {
  return (
    <ModuleStub
      title="Importação de NF-e"
      description="Processamento automatizado de XMLs de Notas Fiscais Eletrônicas."
      icon={FileText}
    />
  )
}
