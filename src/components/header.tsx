"use client"

import { Search, Bell, User } from "lucide-react"
import { EmpresaSelector } from "./EmpresaSelector"

export function Header() {
  return (
    <header className="h-16 bg-[#0F172A]/80 backdrop-blur border-b border-white/10 sticky top-0 z-10 px-6 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <EmpresaSelector />
        <div className="flex items-center bg-[#0B1120] border border-white/10 rounded-lg px-3 py-2 w-80">
          <Search size={16} className="text-white/30 mr-2" />
          <input 
            type="text" 
            placeholder="Pesquisar lançamentos..." 
            className="bg-transparent outline-none text-sm w-full placeholder:text-white/30 text-white"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="text-white/50 hover:text-white transition-colors relative">
          <Bell size={20} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full"></span>
        </button>
        <div className="w-8 h-8 rounded-full bg-[#151F32] border border-white/10 flex items-center justify-center">
          <User size={16} className="text-white/70" />
        </div>
      </div>
    </header>
  )
}