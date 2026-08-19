'use client'

import { useRef, useState, useTransition } from 'react'
import { criarConta } from './actions'
import { X, PlusCircle, Loader2 } from 'lucide-react'

interface Props {
  /** Fornecedores ja cadastrados para sugestao no datalist */
  fornecedores: { id: string; nome: string }[]
}

export default function NovaContaForm({ fornecedores }: Props) {
  const [aberto, setAberto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setErro(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      try {
        await criarConta(formData)
        formRef.current?.reset()
        setAberto(false)
      } catch (err) {
        setErro(err instanceof Error ? err.message : 'Erro desconhecido')
      }
    })
  }

  return (
    <>
      {/* Botao Nova Conta */}
      <button
        id="btn-nova-conta"
        onClick={() => setAberto(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        <PlusCircle size={16} />
        Nova Conta
      </button>

      {/* Overlay / Modal */}
      {aberto && (
        <div
          id="modal-nova-conta"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setAberto(false)}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            {/* Cabecalho */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">Nova Conta a Pagar</h2>
              <button
                onClick={() => setAberto(false)}
                className="text-slate-400 hover:text-white transition-colors"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Formulario */}
            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
              {/* Fornecedor */}
              <div>
                <label htmlFor="campo-fornecedor" className="block text-sm text-slate-300 mb-1">
                  Fornecedor
                </label>
                <input
                  id="campo-fornecedor"
                  name="fornecedor"
                  list="lista-fornecedores"
                  required
                  placeholder="Nome do fornecedor"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="lista-fornecedores">
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.nome} />
                  ))}
                </datalist>
              </div>

              {/* Descricao */}
              <div>
                <label htmlFor="campo-descricao" className="block text-sm text-slate-300 mb-1">
                  Descricao
                </label>
                <input
                  id="campo-descricao"
                  name="descricao"
                  required
                  placeholder="Ex: Aluguel de outubro"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Valor e Vencimento */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="campo-valor" className="block text-sm text-slate-300 mb-1">
                    Valor (R$)
                  </label>
                  <input
                    id="campo-valor"
                    name="valor"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0,00"
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label htmlFor="campo-vencimento" className="block text-sm text-slate-300 mb-1">
                    Vencimento
                  </label>
                  <input
                    id="campo-vencimento"
                    name="vencimento"
                    type="date"
                    required
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Erro */}
              {erro && (
                <p className="text-sm text-red-400 bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-2">
                  {erro}
                </p>
              )}

              {/* Acoes */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  id="btn-salvar-conta"
                  type="submit"
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {isPending && <Loader2 size={14} className="animate-spin" />}
                  {isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
