import React from 'react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Glow Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Parceiro Financeiro v2
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Gestão Financeira Inteligente
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Acesse sua conta para gerenciar fluxo de caixa, conciliação e DRE.
          </p>
        </div>

        {children}

        <footer className="mt-8 text-center text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Parceiro Financeiro. Todos os direitos reservados.
        </footer>
      </div>
    </div>
  )
}
