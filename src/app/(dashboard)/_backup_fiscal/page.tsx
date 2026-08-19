import React from 'react'
import ModuleStub from '@/components/module-stub'
import { Building2 } from 'lucide-react'

export default function FiscalPage() {
  return (
    <ModuleStub
      title="Módulo Fiscal"
      description="Apuração de impostos (Simples Nacional, Lucro Presumido) e obrigações acessórias."
      icon={Building2}
    />
  )
}
