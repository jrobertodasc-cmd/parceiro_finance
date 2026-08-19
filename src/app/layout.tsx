import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Parceiro Financeiro v2.0 Enterprise",
  description: "ERP Financeiro Enterprise",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#0B1120] text-white antialiased">
        {children}
      </body>
    </html>
  )
}