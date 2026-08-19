import React from 'react'
import ModuleStub from '@/components/module-stub'
import { Settings } from 'lucide-react'

export default function ConfiguracoesPage() {
  return (
    <ModuleStub
      title="Configurações do Sistema"
      description="Dados da empresa, usuários, permissões, integrações de API e preferências."
      icon={Settings}
    />
  )
}
