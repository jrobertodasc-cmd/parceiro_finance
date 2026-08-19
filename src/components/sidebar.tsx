"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Wallet, 
  ArrowLeftRight, 
  FileUp, 
  ListTree, 
  LineChart, 
  Bot, 
  Landmark, 
  Target, 
  PieChart,
  CalendarDays
} from "lucide-react"

const MENU_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Contas", href: "/contas", icon: Wallet },
  { name: "Conciliação", href: "/conciliacao", icon: ArrowLeftRight },
  { name: "Importação NF-e", href: "/importacao-nfe", icon: FileUp },
  { name: "Plano de Contas", href: "/plano-de-contas", icon: ListTree },
  { name: "DRE Gerencial", href: "/dre", icon: LineChart },
  { name: "Previsão Semanal", href: "/previsao-semanal", icon: CalendarDays },
  { name: "Copiloto IA", href: "/copiloto", icon: Bot },
  { name: "Fiscal", href: "/fiscal", icon: Landmark },
  { name: "Metas", href: "/metas", icon: Target },
  { name: "BI Analítico", href: "/bi-analitico", icon: PieChart },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside className={`sticky top-0 ${collapsed ? 'w-20' : 'w-64'} shrink-0 h-screen bg-[#0F172A] border-r border-white/10 flex flex-col overflow-y-auto custom-scroll transition-all duration-300 z-50`}>
      <div className="p-4 flex items-center justify-between">
        <div className={`flex items-center gap-3 text-white overflow-hidden transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          <div className="w-8 h-8 shrink-0 rounded-lg bg-blue-600 flex items-center justify-center font-bold">
            PF
          </div>
          <span className="font-bold text-lg tracking-tight whitespace-nowrap">Parceiro Fin.</span>
        </div>
        <button 
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors shrink-0"
        >
          {collapsed ? '>' : '<'}
        </button>
      </div>

      <nav className="flex-1 px-3 pb-6 space-y-2 mt-4">
        {MENU_ITEMS.map((item) => {
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? "bg-blue-600/20 text-blue-400" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              } ${collapsed ? 'justify-center' : ''}`}
              title={collapsed ? item.name : undefined}
            >
              <Icon size={18} className={`shrink-0 ${isActive ? "text-blue-500" : "text-white/40"}`} />
              {!collapsed && <span className="whitespace-nowrap">{item.name}</span>}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}