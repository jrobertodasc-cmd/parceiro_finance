import React from 'react'
import ModuleStub from '@/components/module-stub'
import { FolderTree } from 'lucide-react'

export default function PlanoContasPage() {
  return (
    <ModuleStub
      title="Plano de Contas"
      description="Estrutura hierárquica de categorias de receitas, custos e despesas."
      icon={FolderTree}
    />
  )
}
