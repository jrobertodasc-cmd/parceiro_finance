"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import JSZip from "jszip"
import { UploadCloud, CheckCircle2, FileUp, AlertTriangle, FileText, ArrowRight } from "lucide-react"
import Link from "next/link"

type NfeParsed = {
  id: string;
  xml_chave: string;
  emitente: string;
  produto: string;
  valor: number;
  data_emissao: string;
  status: 'pronto' | 'sucesso' | 'erro' | 'duplicada';
  mensagem?: string;
  plano_conta_id?: string;
}

export default function ImportacaoNFePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [importando, setImportando] = useState(false)
  const [notas, setNotas] = useState<NfeParsed[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [estatisticas, setEstatisticas] = useState({
    total: 0,
    sucesso: 0,
    duplicada: 0,
    erro: 0
  })

  // Mapeamentos de categorias para carregar na inicialização
  const obterIdsPlanos = async () => {
    // Busca os IDs dinamicamente
    const { data } = await supabase
      .from('plano_de_contas')
      .select('id, codigo')
      .in('codigo', ['1.01.007', '2.01.001', '2.01.002'])

    const map: Record<string, string> = {}
    if (data) {
      data.forEach(p => map[p.codigo] = p.id)
    }
    return map
  }

  const getCodigoPlano = (xProd: string): string => {
    const n = xProd.toLowerCase()
    if (n.includes('gnre') || n.includes('imposto') || n.includes('taxa') || n.includes('icms') || n.includes('dare') || n.includes('guia')) {
      return '1.01.007'
    }
    if (n.includes('aluguel')) {
      return '2.01.001'
    }
    // DEFAULT É COMPRA DE PRODUTOS, NUNCA ALUGUEL
    return '2.01.002'
  }

  const lerArquivo = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  const parseXML = (xmlString: string, mapPlanos: Record<string, string>): NfeParsed | null => {
    try {
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(xmlString, "text/xml")

      const infNFe = xmlDoc.getElementsByTagName("infNFe")[0]
      if (!infNFe) return null

      const xml_chave = infNFe.getAttribute("Id")?.replace("NFe", "") || ""
      
      const dhEmiNode = xmlDoc.getElementsByTagName("dhEmi")[0] || xmlDoc.getElementsByTagName("dEmi")[0]
      const data_emissao = dhEmiNode ? dhEmiNode.textContent?.substring(0, 10) || "" : ""

      const emitNode = xmlDoc.getElementsByTagName("emit")[0]
      const emitente = emitNode ? emitNode.getElementsByTagName("xNome")[0]?.textContent || "Desconhecido" : "Desconhecido"

      const detNodes = xmlDoc.getElementsByTagName("det")
      let produtosArr = []
      for (let i = 0; i < detNodes.length; i++) {
        const xProd = detNodes[i].getElementsByTagName("xProd")[0]?.textContent
        if (xProd) produtosArr.push(xProd)
      }
      const produtoPrincipal = produtosArr.length > 0 ? produtosArr[0] : "Produto Genérico"
      
      const vNFNode = xmlDoc.getElementsByTagName("vNF")[0]
      const valor = vNFNode ? parseFloat(vNFNode.textContent || "0") : 0

      // Mapeamento dinâmico baseado nas regras
      const codigoAlvo = getCodigoPlano(produtoPrincipal)
      const plano_conta_id = mapPlanos[codigoAlvo] || undefined

      return {
        id: Math.random().toString(36).substring(7),
        xml_chave,
        emitente,
        produto: produtoPrincipal,
        valor,
        data_emissao,
        status: 'pronto',
        plano_conta_id
      }
    } catch (e) {
      console.error("Erro ao fazer parse do XML", e)
      return null
    }
  }

  const processarArquivos = async (files: FileList | File[]) => {
    setProcessando(true)
    const novasNotas: NfeParsed[] = []
    
    try {
      const mapPlanos = await obterIdsPlanos()

      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        if (file.name.toLowerCase().endsWith('.zip')) {
          const zip = new JSZip()
          const zipContent = await zip.loadAsync(file)
          
          for (const [filename, zipEntry] of Object.entries(zipContent.files)) {
            if (!zipEntry.dir && filename.toLowerCase().endsWith('.xml')) {
              const xmlString = await zipEntry.async('string')
              const parsed = parseXML(xmlString, mapPlanos)
              if (parsed) novasNotas.push(parsed)
            }
          }
        } else if (file.name.toLowerCase().endsWith('.xml')) {
          const xmlString = await lerArquivo(file)
          const parsed = parseXML(xmlString, mapPlanos)
          if (parsed) novasNotas.push(parsed)
        }
      }

      setNotas(prev => [...prev, ...novasNotas])
    } catch (e) {
      console.error("Erro ao processar arquivos", e)
      alert("Erro ao processar alguns arquivos. Verifique o console.")
    } finally {
      setProcessando(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processarArquivos(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const importarNotas = async () => {
    if (notas.filter(n => n.status === 'pronto').length === 0) {
      alert("Nenhuma nota pronta para importar.")
      return
    }

    setImportando(true)
    
    let contSucesso = 0
    let contDuplicada = 0
    let contErro = 0

    const notasProcessadas = [...notas]

    for (let i = 0; i < notasProcessadas.length; i++) {
      const nota = notasProcessadas[i]
      if (nota.status !== 'pronto') continue

      // Verifica duplicidade pela chave XML
      const { data: existente, error: errVerifica } = await supabase
        .from('contas_a_pagar')
        .select('id')
        .eq('xml_chave', nota.xml_chave)
        .maybeSingle()

      if (existente) {
        notasProcessadas[i].status = 'duplicada'
        notasProcessadas[i].mensagem = 'Chave XML já existe no sistema'
        contDuplicada++
        continue
      }

      // Procura ou cria fornecedor
      let fornecedorId = null
      if (nota.emitente) {
        const { data: fornExistente } = await supabase
          .from('fornecedores')
          .select('id')
          .ilike('nome', nota.emitente)
          .maybeSingle()
          
        if (fornExistente) {
          fornecedorId = fornExistente.id
        } else {
          const { data: novoForn, error: errNovoForn } = await supabase
            .from('fornecedores')
            .insert({ nome: nota.emitente })
            .select('id')
            .single()
            
          if (novoForn) fornecedorId = novoForn.id
        }
      }

      // Insere a conta
      const { error: errInsert } = await supabase
        .from('contas_a_pagar')
        .insert({
          descricao: `${nota.emitente} - ${nota.produto}`.substring(0, 255),
          valor: nota.valor,
          vencimento: nota.data_emissao,
          status: 'pendente',
          plano_conta_id: nota.plano_conta_id,
          fornecedor_id: fornecedorId,
          origem: 'nfe',
          xml_chave: nota.xml_chave
        })

      if (errInsert) {
        console.error("Erro inserindo nota:", errInsert)
        notasProcessadas[i].status = 'erro'
        notasProcessadas[i].mensagem = errInsert.message
        contErro++
      } else {
        notasProcessadas[i].status = 'sucesso'
        contSucesso++
      }
    }

    setNotas(notasProcessadas)
    setEstatisticas({
      total: notasProcessadas.length,
      sucesso: contSucesso,
      duplicada: contDuplicada,
      erro: contErro
    })
    setImportando(false)
    alert(`Importação concluída! ${contSucesso} importadas, ${contDuplicada} duplicadas ignoradas, ${contErro} erros.`)
  }

  const limparLista = () => {
    setNotas([])
    setEstatisticas({ total: 0, sucesso: 0, duplicada: 0, erro: 0 })
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Importação de NF-e</h1>
          <p className="text-white/50 mt-1">Carregue arquivos XML avulsos ou compactados em um arquivo ZIP.</p>
        </div>
        
        <div className="flex gap-3">
          <Link href="/contas" className="flex items-center gap-2 bg-[#1E293B] hover:bg-[#334155] px-4 py-2 rounded-xl text-sm font-bold transition-colors">
            Ver Contas
          </Link>
          <Link href="/dre" className="flex items-center gap-2 bg-[#1E293B] hover:bg-[#334155] px-4 py-2 rounded-xl text-sm font-bold transition-colors">
            Ver DRE
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LADO ESQUERDO: UPLOAD & ESTATÍSTICAS */}
        <div className="lg:col-span-1 space-y-6">
          <div 
            className="border-2 border-dashed border-white/20 hover:border-blue-500 bg-[#151F32] rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer group h-64"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              multiple 
              accept=".xml,.zip" 
              className="hidden" 
              ref={fileInputRef}
              onChange={(e) => {
                if (e.target.files) processarArquivos(e.target.files)
              }}
            />
            
            <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <UploadCloud size={32} />
            </div>
            <h3 className="font-bold text-lg">Selecione ou Arraste arquivos</h3>
            <p className="text-sm text-white/40 mt-2">Suporta .XML individual e arquivos .ZIP</p>
            
            {processando && <p className="text-blue-400 font-bold mt-4 animate-pulse">Lendo arquivos...</p>}
          </div>

          <div className="bg-[#151F32] border border-white/10 rounded-2xl p-6">
            <h3 className="font-bold mb-4">Resumo da Importação</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/60">Total lido</span>
                <span className="font-bold">{notas.length}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-emerald-400">Importadas com sucesso</span>
                <span className="font-bold">{estatisticas.sucesso}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-amber-400">Duplicadas ignoradas</span>
                <span className="font-bold">{estatisticas.duplicada}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-red-400">Erros</span>
                <span className="font-bold">{estatisticas.erro}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button 
                onClick={importarNotas}
                disabled={importando || notas.filter(n => n.status === 'pronto').length === 0}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 disabled:text-white/30 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {importando ? 'Gravando no Banco...' : 'Processar Importação'}
                <ArrowRight size={18} />
              </button>
              
              {notas.length > 0 && (
                <button 
                  onClick={limparLista}
                  className="w-full flex items-center justify-center gap-2 bg-transparent border border-white/10 hover:bg-white/5 text-white/60 font-bold py-3 rounded-xl transition-colors"
                >
                  Limpar Lista
                </button>
              )}
            </div>
          </div>
        </div>

        {/* LADO DIREITO: PREVIEW TABLE */}
        <div className="lg:col-span-2 bg-[#151F32] rounded-2xl border border-white/10 overflow-hidden shadow-lg flex flex-col h-[calc(100vh-200px)] min-h-[500px]">
          <div className="grid grid-cols-12 p-4 text-xs text-white/40 uppercase tracking-widest border-b border-white/10 font-bold bg-[#0F172A]/50">
            <div className="col-span-3">Status</div>
            <div className="col-span-4">Emitente / Produto</div>
            <div className="col-span-2">Emissão</div>
            <div className="col-span-3 text-right">Valor Total</div>
          </div>
          
          <div className="overflow-y-auto custom-scroll flex-1 p-2">
            {notas.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-white/30 p-12">
                <FileText size={48} className="mb-4 opacity-20" />
                <p>Nenhuma nota processada ainda.</p>
                <p className="text-sm mt-1">Solte seus arquivos XML para iniciar.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notas.map((n, i) => (
                  <div key={n.id} className="grid grid-cols-12 p-3 bg-white/5 rounded-xl items-center border border-white/5">
                    
                    <div className="col-span-3 flex items-center">
                      {n.status === 'pronto' && <span className="bg-blue-500/10 text-blue-400 text-xs px-2 py-1 rounded font-bold">Na fila</span>}
                      {n.status === 'sucesso' && <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-1 rounded font-bold flex items-center gap-1"><CheckCircle2 size={12}/> Sucesso</span>}
                      {n.status === 'duplicada' && <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-1 rounded font-bold flex items-center gap-1" title={n.mensagem}><AlertTriangle size={12}/> Duplicada</span>}
                      {n.status === 'erro' && <span className="bg-red-500/10 text-red-400 text-xs px-2 py-1 rounded font-bold" title={n.mensagem}>Erro DB</span>}
                    </div>
                    
                    <div className="col-span-4 pr-4">
                      <p className="font-bold text-sm truncate">{n.emitente}</p>
                      <p className="text-xs text-white/50 truncate" title={n.produto}>{n.produto}</p>
                    </div>
                    
                    <div className="col-span-2 text-sm text-white/70">
                      {n.data_emissao ? new Date(n.data_emissao + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}
                    </div>
                    
                    <div className="col-span-3 text-right font-mono font-bold text-emerald-400">
                      R$ {n.valor.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  )
}
