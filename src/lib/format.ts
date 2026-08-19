export function formatBRL(valor: number | string) {
  const n = Number(valor) || 0
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatBRLShort(valor: number) {
  return formatBRL(valor)
}
