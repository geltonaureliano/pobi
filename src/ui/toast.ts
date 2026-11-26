/** Avisos rápidos (toast) para o app inteiro. Chame de qualquer lugar: toast.sucesso('Receita salva'). */
export type TipoToast = 'sucesso' | 'erro' | 'info' | 'aviso'
export interface Toast { id: number; tipo: TipoToast; texto: string; detalhe?: string; duracao: number }

let proximo = 1
let fila: Toast[] = []
const ouvintes = new Set<(t: Toast[]) => void>()
const avisar = () => ouvintes.forEach((o) => o(fila))

function mostrar(tipo: TipoToast, texto: string, detalhe?: string, duracao = tipo === 'erro' ? 6000 : 3200) {
  // Mesma mensagem repetida em sequência não empilha: só renova.
  fila = fila.filter((t) => !(t.texto === texto && t.tipo === tipo))
  const t: Toast = { id: proximo++, tipo, texto, detalhe, duracao }
  fila = [...fila, t].slice(-4)
  avisar()
  return t.id
}

export const toast = {
  sucesso: (texto: string, detalhe?: string) => mostrar('sucesso', texto, detalhe),
  erro: (texto: string, detalhe?: string) => mostrar('erro', texto, detalhe),
  info: (texto: string, detalhe?: string) => mostrar('info', texto, detalhe),
  aviso: (texto: string, detalhe?: string) => mostrar('aviso', texto, detalhe, 5000),
  fechar: (id: number) => { fila = fila.filter((t) => t.id !== id); avisar() },
  ouvir: (o: (t: Toast[]) => void) => { ouvintes.add(o); o(fila); return () => { ouvintes.delete(o) } },
}
