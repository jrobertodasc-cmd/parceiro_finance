'use client'
import { useState } from 'react'
import { pagarConta, deletarConta } from './actions'
import EditarContaForm from './EditarContaForm'

export default function ContaActions({ conta }: { conta: any }) {
  const [loading, setLoading] = useState(false)
  return (
    <div className="flex gap-2">
      {conta.status === 'pendente' && (
        <button
          disabled={loading}
          onClick={async () => {
            setLoading(true)
            await pagarConta(conta.id)
            setLoading(false)
          }}
          className="px-2 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded"
        >
          Pagar
        </button>
      )}
      <EditarContaForm conta={conta} />
      <button
        onClick={async () => {
          if (!confirm('Deletar?')) return
          await deletarConta(conta.id)
        }}
        className="px-2 py-1 text-xs bg-slate-700 hover:bg-red-600 text-white rounded"
      >
        Excluir
      </button>
    </div>
  )
}