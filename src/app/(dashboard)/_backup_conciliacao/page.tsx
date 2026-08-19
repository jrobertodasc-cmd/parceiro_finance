import React from 'react'
import ModuleStub from '@/components/module-stub'
import { ArrowLeftRight } from 'lucide-react'

export default function ConciliacaoPage() {
  return (
    <ModuleStub
      title="Conciliação Bancária"
      description="Confronto entre extratos bancários (OFX/CSV) e os lançamentos do sistema."
      icon={ArrowLeftRight}
    />
  )
}
