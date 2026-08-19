import React from 'react'
import { Construction, Sparkles } from 'lucide-react'

interface ModuleStubProps {
  title: string
  description: string
  icon: React.ElementType
  badge?: string
}

export default function ModuleStub({
  title,
  description,
  icon: Icon,
  badge,
}: ModuleStubProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-blue-600/10 border border-blue-500/20 rounded-2xl text-blue-400">
            <Icon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-100">{title}</h1>
              {badge && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {badge}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-1">{description}</p>
          </div>
        </div>
      </div>

      {/* Development Notice Container */}
      <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-full text-slate-400">
          <Construction className="w-8 h-8 text-amber-400 animate-pulse" />
        </div>
        <div className="max-w-md space-y-2">
          <h3 className="text-lg font-semibold text-slate-200">
            Módulo {title} em Fundação
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Esta rota já está estruturada e vinculada ao menu lateral e ao middleware de autenticação. A lógica de negócio será implementada na próxima etapa.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs text-slate-300">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          Navegação e Infraestrutura Prontas
        </div>
      </div>
    </div>
  )
}
