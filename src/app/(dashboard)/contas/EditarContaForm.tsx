'use client'
import { useState } from 'react'
import { editarConta } from './actions'

export default function EditarContaForm({ conta }: { conta: any }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-2 py-1 text-xs bg-slate-700 hover:bg-blue-600 text-white rounded"
      >
        Editar
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-xl w-full max-w-md border border-slate-700">
            <h2 className="text-white font-semibold mb-4">Editar Conta</h2>
            <form
              action={async (formData) => {
                await editarConta(formData)
                setOpen(false)
              }}
              className="space-y-4"
            >
              <input type="hidden" name="id" value={conta.id} />
              
              <input name="fornecedor" defaultValue={conta.fornecedores?.nome} placeholder="Fornecedor" className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white" required />
              <input name="descricao" defaultValue={conta.descricao} placeholder="Descrição" className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white" required />
              <input name="valor" type="number" step="0.01" defaultValue={conta.valor} placeholder="Valor" className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white" required />
              <input name="vencimento" type="date" defaultValue={conta.vencimento} className="w-full p-2 rounded bg-slate-900 border border-slate-700 text-white" required />

              <div className="flex gap-2 justify-end">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm bg-slate-700 text-white rounded">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-sm bg-blue-600 text-white rounded">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}