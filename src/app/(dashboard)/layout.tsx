import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { EmpresaProvider } from "@/contexts/EmpresaContext"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <EmpresaProvider>
      <div className="flex min-h-screen bg-[#0B1120]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen w-0">
          <Header />
          <main className="flex-1 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </EmpresaProvider>
  )
}
